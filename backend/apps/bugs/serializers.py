from rest_framework import serializers

from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.bugs.models import Bug
from apps.core.serializers import (
    ActivityLogSerializer,
    AttachmentSerializer,
    CommentSerializer,
    TimeEntrySerializer,
)


class BugSerializer(serializers.ModelSerializer):
    assignee_detail = UserSerializer(source="assignee", read_only=True)
    assignee_department_detail = DepartmentSerializer(
        source="assignee_department", read_only=True
    )
    reporter_detail = UserSerializer(source="reporter", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    time_entries = TimeEntrySerializer(many=True, read_only=True)
    activity_logs = ActivityLogSerializer(many=True, read_only=True)

    class Meta:
        model = Bug
        fields = (
            "id",
            "project",
            "project_name",
            "related_task",
            "title",
            "description",
            "steps_to_reproduce",
            "environment",
            "status",
            "severity",
            "priority",
            "assignee",
            "assignee_detail",
            "assignee_department",
            "assignee_department_detail",
            "reporter",
            "reporter_detail",
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
            "comments",
            "attachments",
            "time_entries",
            "activity_logs",
            "created_at",
            "updated_at",
            "assignee_detail",
            "assignee_department_detail",
        )


class BugListSerializer(serializers.ModelSerializer):
    assignee_detail = UserSerializer(source="assignee", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Bug
        fields = (
            "id",
            "project",
            "project_name",
            "title",
            "status",
            "severity",
            "priority",
            "assignee",
            "assignee_detail",
            "due_date",
            "updated_at",
        )


class BugStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Bug._meta.get_field("status").choices)


class BugRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=10)
