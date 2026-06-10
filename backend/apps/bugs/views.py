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
    BugUpdateSerializer,
)
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
from apps.core.services import log_activity, notify_status_change, notify_user, record_audit_log
from apps.core.utils import validate_file_size, validate_mime_type


class BugViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "steps_to_reproduce", "tags"]
    filterset_fields = [
        "status",
        "severity",
        "priority",
        "project",
        "assignees",
        "assignee_department",
    ]
    ordering_fields = ["updated_at", "due_date", "created_at"]
    create_message = "Bug created."
    update_message = "Bug updated."
    delete_message = "Bug deleted."

    def get_queryset(self):
        qs = Bug.objects.select_related(
            "project", "assignee_department", "reporter", "related_task"
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
            return BugListSerializer
        if self.action in ("update", "partial_update"):
            return BugUpdateSerializer
        return BugSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if not user_has_permission(request.user, "can_create_bugs"):
            return error_response(
                "Your department does not have permission to create bugs.",
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        bug = serializer.save(reporter=self.request.user)
        if bug.assignees.filter(id=self.request.user.id).exists():
            bug.assignees.remove(self.request.user)
        log_activity(
            actor=self.request.user,
            action="bug_created",
            detail=bug.title,
            bug=bug,
        )
        for assignee in bug.assignees.all():
            notify_user(
                user=assignee,
                title="New bug assigned",
                message=f"You were assigned bug: {bug.title}",
                link=f"/bugs/{bug.id}",
            )
        record_audit_log(
            actor=self.request.user,
            action="created",
            entity_type="bug",
            entity_id=bug.id,
            entity_label=bug.title,
        )

    def update(self, request, *args, **kwargs):
        bug = self.get_object()
        if not can_edit_work_item(request.user, bug, "can_edit_bugs"):
            return error_response(
                "Only the bug owner or users with edit permission can change details.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(bug, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if "assignees" in serializer.validated_data:
            assignees = serializer.validated_data["assignees"]
            serializer.validated_data["assignees"] = [
                user for user in assignees if user.id != request.user.id
            ]
        serializer.save()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="bug",
            entity_id=bug.id,
            entity_label=bug.title,
        )
        return success_response(
            data=BugSerializer(
                Bug.objects.prefetch_related("assignees").get(pk=bug.pk),
                context={"request": request},
            ).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        bug = self.get_object()
        if not is_owner_or_admin(request.user, bug):
            return error_response(
                "Only the bug owner can delete this bug.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="bug",
            entity_id=bug.id,
            entity_label=bug.title,
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        bug = self.get_object()
        if not can_change_status(request.user, bug):
            return error_response(
                "Only the bug owner or assignees can change status.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BugStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        if new_status == BugStatus.REJECTED:
            return error_response(
                "Use the reject endpoint with a reason to reject a bug.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = bug.status
        if old == new_status:
            return success_response(
                data=BugSerializer(bug, context={"request": request}).data,
                message=f"Status is already {old.replace('_', ' ')}.",
            )
        bug.status = new_status
        bug.save(update_fields=["status", "updated_at"])
        log_activity(
            actor=request.user,
            action="status_changed",
            detail=f"{old} -> {bug.status}",
            bug=bug,
        )
        notify_status_change(
            obj=bug,
            actor=request.user,
            old_status=old,
            new_status=bug.status,
        )
        return success_response(
            data=BugSerializer(bug, context={"request": request}).data,
            message=(
                f"Status changed from {old.replace('_', ' ')} "
                f"to {bug.status.replace('_', ' ')}."
            ),
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        bug = self.get_object()
        if not can_change_status(request.user, bug):
            return error_response(
                "Only the bug owner or assignees can reject this bug.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BugRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]
        old = bug.status

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

        notify_status_change(
            obj=bug,
            actor=request.user,
            old_status=old,
            new_status=bug.status,
        )

        return success_response(
            data=BugSerializer(bug, context={"request": request}).data,
            message=f"Bug rejected. Status changed from {old.replace('_', ' ')} to rejected.",
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

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"attachments/(?P<attachment_id>[^/.]+)",
    )
    def delete_attachment(self, request, pk=None, attachment_id=None):
        bug = self.get_object()
        try:
            attachment = bug.attachments.get(pk=attachment_id)
        except Attachment.DoesNotExist:
            return error_response("Attachment not found.", status=status.HTTP_404_NOT_FOUND)
        if not can_delete_attachment(request.user, attachment, bug):
            return error_response(
                "You do not have permission to delete this file.",
                status=status.HTTP_403_FORBIDDEN,
            )
        attachment.file.delete(save=False)
        attachment.delete()
        return success_response(message="Attachment deleted.")

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
