from django.conf import settings
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.bugs.models import Bug, BugStatus
from apps.bugs.serializers import (
    BugListSerializer,
    BugRejectSerializer,
    BugSerializer,
    BugStatusSerializer,
)
from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.models import Attachment, AttachmentType, Comment, CommentType
from apps.core.responses import error_response, success_response
from apps.core.serializers import (
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)
from apps.core.services import log_activity, notify_user
from apps.core.utils import validate_file_size, validate_mime_type


class BugViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "steps_to_reproduce", "tags"]
    filterset_fields = [
        "status",
        "severity",
        "priority",
        "project",
        "assignee",
        "assignee_department",
    ]
    ordering_fields = ["updated_at", "due_date", "created_at"]
    create_message = "Bug created."
    update_message = "Bug updated."
    delete_message = "Bug deleted."

    def get_queryset(self):
        qs = Bug.objects.select_related(
            "project", "assignee", "assignee_department", "reporter", "related_task"
        )
        if self.request.user.role != "admin":
            qs = qs.filter(project_id__in=user_project_ids(self.request.user))
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "comments__author",
                "attachments",
                "time_entries__user",
                "activity_logs__actor",
            )
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return BugListSerializer
        return BugSerializer

    def perform_create(self, serializer):
        bug = serializer.save(reporter=self.request.user)
        log_activity(
            actor=self.request.user,
            action="bug_created",
            detail=bug.title,
            bug=bug,
        )
        if bug.assignee:
            notify_user(
                user=bug.assignee,
                title="New bug assigned",
                message=f"You were assigned bug: {bug.title}",
                link=f"/bugs/{bug.id}",
            )

    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        bug = self.get_object()
        serializer = BugStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        if new_status == BugStatus.REJECTED:
            return error_response(
                "Use the reject endpoint with a reason to reject a bug.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = bug.status
        bug.status = new_status
        bug.save(update_fields=["status", "updated_at"])
        log_activity(
            actor=request.user,
            action="status_changed",
            detail=f"{old} -> {bug.status}",
            bug=bug,
        )
        if bug.reporter:
            notify_user(
                user=bug.reporter,
                title="Bug status updated",
                message=f"{bug.title} is now {bug.status}",
                link=f"/bugs/{bug.id}",
            )
        return success_response(
            data=BugSerializer(bug, context={"request": request}).data,
            message="Status updated.",
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        bug = self.get_object()
        serializer = BugRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        with transaction.atomic():
            bug.status = BugStatus.REJECTED
            bug.save(update_fields=["status", "updated_at"])
            Comment.objects.create(
                bug=bug,
                author=request.user,
                text=reason,
                comment_type=CommentType.REJECTION_REASON,
            )
            log_activity(
                actor=request.user,
                action="bug_rejected",
                detail=reason[:200],
                bug=bug,
            )

        if bug.reporter:
            notify_user(
                user=bug.reporter,
                title="Bug rejected",
                message=f"{bug.title} was rejected: {reason[:120]}",
                link=f"/bugs/{bug.id}",
            )

        return success_response(
            data=BugSerializer(bug, context={"request": request}).data,
            message="Bug rejected.",
        )

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        bug = self.get_object()
        if request.method == "GET":
            data = CommentSerializer(
                bug.comments.select_related("author"), many=True
            ).data
            return success_response(data=data)
        serializer = CommentSerializer(data={**request.data, "bug": bug.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return success_response(
            data=serializer.data,
            message="Comment added.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        bug = self.get_object()
        if request.method == "GET":
            serializer = AttachmentSerializer(
                bug.attachments.all(), many=True, context={"request": request}
            )
            return success_response(data=serializer.data)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return error_response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        content_type = getattr(file_obj, "content_type", "")
        try:
            if content_type in settings.ALLOWED_VIDEO_TYPES:
                validate_file_size(file_obj, settings.MAX_VIDEO_SIZE_MB)
                validate_mime_type(file_obj, settings.ALLOWED_VIDEO_TYPES)
                att_type = AttachmentType.VIDEO
            else:
                validate_file_size(file_obj, settings.MAX_IMAGE_SIZE_MB)
                validate_mime_type(file_obj, settings.ALLOWED_IMAGE_TYPES)
                att_type = AttachmentType.IMAGE
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        attachment = Attachment.objects.create(
            bug=bug,
            file=file_obj,
            original_name=file_obj.name,
            mime_type=content_type,
            size_bytes=file_obj.size,
            attachment_type=att_type,
            uploaded_by=request.user,
        )
        serializer = AttachmentSerializer(attachment, context={"request": request})
        return success_response(
            data=serializer.data,
            message="Attachment uploaded.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="time-entries")
    def time_entries(self, request, pk=None):
        bug = self.get_object()
        if request.method == "GET":
            serializer = TimeEntrySerializer(
                bug.time_entries.select_related("user"), many=True
            )
            return success_response(data=serializer.data)
        serializer = TimeEntrySerializer(data={**request.data, "bug": bug.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return success_response(
            data=serializer.data,
            message="Time logged.",
            status=status.HTTP_201_CREATED,
        )
