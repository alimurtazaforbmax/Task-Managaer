from django.conf import settings
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.models import Attachment, AttachmentType, Comment, TimeEntry
from apps.core.responses import error_response, success_response
from apps.core.serializers import (
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)
from apps.core.services import log_activity
from apps.core.utils import validate_file_size, validate_mime_type
from apps.tasks.models import Task
from apps.tasks.serializers import TaskListSerializer, TaskSerializer, TaskStatusSerializer


class TaskViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "tags"]
    filterset_fields = ["status", "priority", "project", "assignee", "assignee_department"]
    ordering_fields = ["updated_at", "due_date", "created_at"]
    create_message = "Task created."
    update_message = "Task updated."
    delete_message = "Task deleted."

    def get_queryset(self):
        qs = Task.objects.select_related(
            "project", "assignee", "assignee_department", "reporter"
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
            return TaskListSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        task = serializer.save(reporter=self.request.user)
        log_activity(
            actor=self.request.user,
            action="task_created",
            detail=task.title,
            task=task,
        )

    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        task = self.get_object()
        serializer = TaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old = task.status
        task.status = serializer.validated_data["status"]
        task.save(update_fields=["status", "updated_at"])
        log_activity(
            actor=request.user,
            action="status_changed",
            detail=f"{old} -> {task.status}",
            task=task,
        )
        return success_response(
            data=TaskSerializer(task, context={"request": request}).data,
            message="Status updated.",
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
        serializer.save(author=request.user)
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

    @action(detail=True, methods=["get", "post"], url_path="time-entries")
    def time_entries(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            serializer = TimeEntrySerializer(
                task.time_entries.select_related("user"), many=True
            )
            return success_response(data=serializer.data)
        serializer = TimeEntrySerializer(data={**request.data, "task": task.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return success_response(
            data=serializer.data,
            message="Time logged.",
            status=status.HTTP_201_CREATED,
        )
