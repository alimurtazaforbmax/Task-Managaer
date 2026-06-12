from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.bugs.models import Bug
from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.responses import error_response, success_response
from apps.core.services import record_audit_log
from apps.projects.models import TestCase
from apps.projects.serializers import (
    SpawnFromTestCaseSerializer,
    TestCaseListSerializer,
    TestCaseSerializer,
    TestCaseUpdateSerializer,
)
from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.bugs.serializers import BugSerializer
from apps.tickets.models import Ticket, TicketRequestType
from apps.tickets.serializers import TicketSerializer


def _can_view_test_cases(user) -> bool:
    return is_admin_user(user) or user_has_permission(user, "can_view_test_cases")


def _can_create_test_cases(user) -> bool:
    return is_admin_user(user) or user_has_permission(user, "can_create_test_cases")


def _can_edit_test_cases(user) -> bool:
    return is_admin_user(user) or user_has_permission(user, "can_edit_test_cases")


def _can_delete_test_cases(user) -> bool:
    return is_admin_user(user) or user_has_permission(user, "can_delete_test_cases")


def _build_spawn_description(test_case: TestCase) -> str:
    parts = []
    if test_case.description:
        parts.append(test_case.description.strip())
    if test_case.preconditions:
        parts.append(f"Preconditions:\n{test_case.preconditions.strip()}")
    if test_case.steps:
        parts.append(f"Steps:\n{test_case.steps.strip()}")
    if test_case.expected_result:
        parts.append(f"Expected result:\n{test_case.expected_result.strip()}")
    return "\n\n".join(parts)


class TestCaseViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "steps", "expected_result"]
    filterset_fields = ["status", "priority", "test_type", "project", "feature", "assignee"]
    ordering_fields = ["updated_at", "created_at", "priority"]
    create_message = "Test case created."
    update_message = "Test case updated."
    delete_message = "Test case deleted."

    def get_queryset(self):
        if not _can_view_test_cases(self.request.user):
            return TestCase.objects.none()
        return TestCase.objects.select_related(
            "project", "feature", "assignee", "created_by"
        ).filter(project_id__in=user_project_ids(self.request.user))

    def get_serializer_class(self):
        if self.action == "list":
            return TestCaseListSerializer
        if self.action in ("update", "partial_update"):
            return TestCaseUpdateSerializer
        return TestCaseSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def list(self, request, *args, **kwargs):
        if not _can_view_test_cases(request.user):
            return error_response(
                "You do not have permission to view test cases.",
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if not _can_view_test_cases(request.user):
            return error_response(
                "You do not have permission to view test cases.",
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not _can_create_test_cases(request.user):
            return error_response(
                "You do not have permission to create test cases.",
                status=status.HTTP_403_FORBIDDEN,
            )
        project_id = request.data.get("project")
        if not project_id or int(project_id) not in set(user_project_ids(request.user)):
            return error_response(
                "You must be a member of the project to create a test case.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        test_case = serializer.save(created_by=request.user)
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="test_case",
            entity_id=test_case.id,
            entity_label=test_case.title,
        )
        return success_response(
            data=TestCaseSerializer(test_case, context={"request": request}).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        test_case = self.get_object()
        if not _can_edit_test_cases(request.user):
            return error_response(
                "You do not have permission to edit test cases.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(test_case, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        test_case.refresh_from_db()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="test_case",
            entity_id=test_case.id,
            entity_label=test_case.title,
        )
        return success_response(
            data=TestCaseSerializer(test_case, context={"request": request}).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        test_case = self.get_object()
        if not _can_delete_test_cases(request.user):
            return error_response(
                "You do not have permission to delete test cases.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="test_case",
            entity_id=test_case.id,
            entity_label=test_case.title,
        )
        return super().destroy(request, *args, **kwargs)

    def _can_spawn_from_test_case(self, user, permission: str) -> bool:
        if is_admin_user(user):
            return True
        return user_has_permission(user, permission) or user_has_permission(
            user, "can_create_test_cases"
        )

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        test_case = self.get_object()
        if not self._can_spawn_from_test_case(request.user, "can_create_tasks"):
            return error_response(
                "You do not have permission to create tasks.",
                status=status.HTTP_403_FORBIDDEN,
            )
        body = SpawnFromTestCaseSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        title = (data.get("title") or "").strip() or f"Task: {test_case.title}"
        description = (data.get("description") or "").strip() or _build_spawn_description(
            test_case
        )
        task = Task.objects.create(
            project=test_case.project,
            feature=test_case.feature,
            test_case=test_case,
            title=title[:255],
            description=description,
            status="backlog",
            priority="medium",
            reporter=request.user,
        )
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="task",
            entity_id=task.id,
            entity_label=task.title,
            detail=f"From test case #{test_case.id}",
        )
        return success_response(
            data=TaskSerializer(task, context={"request": request}).data,
            message="Task created from test case.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="create-bug")
    def create_bug(self, request, pk=None):
        test_case = self.get_object()
        if not self._can_spawn_from_test_case(request.user, "can_create_bugs"):
            return error_response(
                "You do not have permission to create bugs.",
                status=status.HTTP_403_FORBIDDEN,
            )
        body = SpawnFromTestCaseSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        title = (data.get("title") or "").strip() or f"Bug: {test_case.title}"
        description = (data.get("description") or "").strip() or test_case.description
        steps = test_case.steps or _build_spawn_description(test_case)
        bug = Bug.objects.create(
            project=test_case.project,
            test_case=test_case,
            title=title[:255],
            description=description,
            steps_to_reproduce=steps,
            status="open",
            severity="medium",
            priority="medium",
            reporter=request.user,
        )
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="bug",
            entity_id=bug.id,
            entity_label=bug.title,
            detail=f"From test case #{test_case.id}",
        )
        return success_response(
            data=BugSerializer(bug, context={"request": request}).data,
            message="Bug created from test case.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="create-ticket")
    def create_ticket(self, request, pk=None):
        test_case = self.get_object()
        if not self._can_spawn_from_test_case(request.user, "can_create_tickets"):
            return error_response(
                "You do not have permission to create tickets.",
                status=status.HTTP_403_FORBIDDEN,
            )
        body = SpawnFromTestCaseSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        title = (data.get("title") or "").strip() or f"Ticket: {test_case.title}"
        description = (data.get("description") or "").strip() or _build_spawn_description(
            test_case
        )
        request_type = data.get("request_type") or "issue"
        type_map = {
            "task": TicketRequestType.TASK,
            "bug": TicketRequestType.BUG,
            "issue": TicketRequestType.ISSUE,
            "other": TicketRequestType.OTHER,
        }
        ticket = Ticket.objects.create(
            project=test_case.project,
            source_test_case=test_case,
            title=title[:255],
            description=description,
            request_type=type_map.get(request_type, TicketRequestType.ISSUE),
            raised_by=request.user,
        )
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
            detail=f"From test case #{test_case.id}",
        )
        return success_response(
            data=TicketSerializer(ticket, context={"request": request}).data,
            message="Ticket created from test case.",
            status=status.HTTP_201_CREATED,
        )
