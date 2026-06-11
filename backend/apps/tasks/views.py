from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions_util import user_has_permission
from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.models import Attachment, AttachmentType, Comment, CommentType
from apps.core.permissions import (
    can_change_status,
    can_delete_attachment,
    can_edit_work_item,
    is_owner_or_admin,
)
from apps.core.responses import error_response, success_response
from apps.core.serializers import (
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)
from apps.core.services import (
    log_activity,
    notify_status_change,
    notify_work_item_comment,
    record_audit_log,
)
from apps.core.utils import validate_file_size, validate_mime_type
from apps.tasks.models import Task
from apps.tasks.serializers import (
    TaskListSerializer,
    TaskSerializer,
    TaskStatusSerializer,
    TaskUpdateSerializer,
)


class TaskViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "tags"]
    filterset_fields = [
        "status",
        "priority",
        "task_type",
        "project",
        "feature",
        "sprint",
        "assignees",
        "assignee_department",
    ]
    ordering_fields = ["updated_at", "due_date", "created_at"]
    create_message = "Task created."
    update_message = "Task updated."
    delete_message = "Task deleted."

    def get_queryset(self):
        qs = Task.objects.select_related(
            "project", "feature", "sprint", "assignee_department", "reporter"
        ).prefetch_related("assignees")
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
            return TaskListSerializer
        if self.action in ("update", "partial_update"):
            return TaskUpdateSerializer
        return TaskSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if not user_has_permission(request.user, "can_create_tasks"):
            return error_response(
                "Your department does not have permission to create tasks.",
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        task = serializer.save(reporter=self.request.user)
        if not user_has_permission(self.request.user, "can_assign_tasks"):
            task.assignees.clear()
        elif task.assignees.filter(id=self.request.user.id).exists():
            task.assignees.remove(self.request.user)
        log_activity(
            actor=self.request.user,
            action="task_created",
            detail=task.title,
            task=task,
        )
        record_audit_log(
            actor=self.request.user,
            action="created",
            entity_type="task",
            entity_id=task.id,
            entity_label=task.title,
        )

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not can_edit_work_item(request.user, task, "can_edit_tasks"):
            return error_response(
                "Only the task owner or users with edit permission can change details.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if not user_has_permission(request.user, "can_assign_tasks"):
            serializer.validated_data.pop("assignees", None)
        elif "assignees" in serializer.validated_data:
            assignees = serializer.validated_data["assignees"]
            serializer.validated_data["assignees"] = [
                user for user in assignees if user.id != request.user.id
            ]
        serializer.save()
        task.refresh_from_db()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="task",
            entity_id=task.id,
            entity_label=task.title,
        )
        return success_response(
            data=TaskSerializer(
                Task.objects.prefetch_related("assignees").get(pk=task.pk),
                context={"request": request},
            ).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not is_owner_or_admin(request.user, task):
            return error_response(
                "Only the task owner can delete this task.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="task",
            entity_id=task.id,
            entity_label=task.title,
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        task = self.get_object()
        if not can_change_status(request.user, task):
            return error_response(
                "Only the task owner or assignees can change status.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        old = task.status
        if old == new_status:
            return success_response(
                data=TaskSerializer(task, context={"request": request}).data,
                message=f"Status is already {old.replace('_', ' ')}.",
            )
        task.status = new_status
        task.save(update_fields=["status", "updated_at"])
        log_activity(
            actor=request.user,
            action="status_changed",
            detail=f"{old} -> {task.status}",
            task=task,
        )
        notify_status_change(
            obj=task,
            actor=request.user,
            old_status=old,
            new_status=task.status,
        )
        return success_response(
            data=TaskSerializer(task, context={"request": request}).data,
            message=(
                f"Status changed from {old.replace('_', ' ')} "
                f"to {task.status.replace('_', ' ')}."
            ),
        )

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            data = CommentSerializer(
                task.comments.select_related("author"), many=True
            ).data
            return success_response(data=data)
        serializer = CommentSerializer(data={**request.data, "task": task.id})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user)
        if comment.comment_type == CommentType.GENERAL:
            notify_work_item_comment(
                obj=task,
                actor=request.user,
                comment_text=comment.text,
            )
        return success_response(
            data=serializer.data,
            message="Comment added.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            serializer = AttachmentSerializer(
                task.attachments.all(), many=True, context={"request": request}
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
            task=task,
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

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"attachments/(?P<attachment_id>[^/.]+)",
    )
    def delete_attachment(self, request, pk=None, attachment_id=None):
        task = self.get_object()
        try:
            attachment = task.attachments.get(pk=attachment_id)
        except Attachment.DoesNotExist:
            return error_response("Attachment not found.", status=status.HTTP_404_NOT_FOUND)
        if not can_delete_attachment(request.user, attachment, task):
            return error_response(
                "You do not have permission to delete this file.",
                status=status.HTTP_403_FORBIDDEN,
            )
        attachment.file.delete(save=False)
        attachment.delete()
        return success_response(message="Attachment deleted.")

    @action(detail=True, methods=["get", "post"], url_path="time-entries")
    def time_entries(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            serializer = TimeEntrySerializer(
                task.time_entries.select_related("user"), many=True
            )
            return success_response(data=serializer.data)
        if not task.assignees.filter(id=request.user.id).exists():
            return error_response(
                "Only assigned team members can log time on this task.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TimeEntrySerializer(data={**request.data, "task": task.id})
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(user=request.user)
        return success_response(
            data=TimeEntrySerializer(entry).data,
            message="Time logged.",
            status=status.HTTP_201_CREATED,
        )
