from rest_framework import serializers
from django.utils import timezone

from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.core.serializers import (
    ActivityLogSerializer,
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)
from apps.accounts.permissions_util import is_admin_user
from apps.core.permissions import can_change_status
from apps.tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    assignees_detail = UserSerializer(source="assignees", many=True, read_only=True)
    assignee_department_detail = DepartmentSerializer(
        source="assignee_department", read_only=True
    )
    reporter_detail = UserSerializer(source="reporter", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    feature_title = serializers.CharField(source="feature.title", read_only=True)
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)
    is_owner = serializers.SerializerMethodField()
    can_change_status = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    time_entries = TimeEntrySerializer(many=True, read_only=True)
    activity_logs = ActivityLogSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "project_name",
            "feature",
            "feature_title",
            "sprint",
            "sprint_name",
            "title",
            "description",
            "status",
            "priority",
            "task_type",
            "assignees",
            "assignees_detail",
            "assignee_department",
            "assignee_department_detail",
            "reporter",
            "reporter_detail",
            "is_owner",
            "can_change_status",
            "due_date",
            "estimated_hours",
            "tags",
            "comments",
            "attachments",
            "time_entries",
            "activity_logs",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reporter",
            "reporter_detail",
            "project_name",
            "status",
            "is_owner",
            "can_change_status",
            "comments",
            "attachments",
            "time_entries",
            "activity_logs",
            "created_at",
            "updated_at",
            "assignees_detail",
            "assignee_department_detail",
            "feature_title",
            "sprint_name",
        )

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if is_admin_user(request.user):
            return True
        return obj.reporter_id == request.user.id

    def get_can_change_status(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return can_change_status(request.user, obj)


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "priority",
            "task_type",
            "feature",
            "sprint",
            "assignees",
            "assignee_department",
            "due_date",
            "estimated_hours",
            "tags",
        )

    def validate_due_date(self, value):
        """Ensure due_date is not in the past."""
        if value and value < timezone.now().date():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def validate_assignees(self, value):
        """Prevent users from assigning tasks to themselves."""
        request = self.context.get("request")
        if request and request.user:
            if request.user.id in value.values_list('id', flat=True):
                raise serializers.ValidationError(
                    "You cannot assign tasks to yourself."
                )
        return value


class TaskListSerializer(serializers.ModelSerializer):
    assignees_detail = UserSerializer(source="assignees", many=True, read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    feature_title = serializers.CharField(source="feature.title", read_only=True)
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "project_name",
            "feature",
            "feature_title",
            "sprint",
            "sprint_name",
            "title",
            "status",
            "priority",
            "task_type",
            "assignees",
            "assignees_detail",
            "assignee_department",
            "reporter",
            "due_date",
            "updated_at",
        )


class TaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task._meta.get_field("status").choices)
