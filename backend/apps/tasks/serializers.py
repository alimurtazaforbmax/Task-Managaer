from rest_framework import serializers

from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.core.serializers import (
    ActivityLogSerializer,
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)
from apps.core.permissions import can_change_status
from apps.tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    assignees_detail = UserSerializer(source="assignees", many=True, read_only=True)
    assignee_department_detail = DepartmentSerializer(
        source="assignee_department", read_only=True
    )
    reporter_detail = UserSerializer(source="reporter", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
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
        )

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
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
            "assignees",
            "assignee_department",
            "due_date",
            "estimated_hours",
            "tags",
        )


class TaskListSerializer(serializers.ModelSerializer):
    assignees_detail = UserSerializer(source="assignees", many=True, read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "project_name",
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
