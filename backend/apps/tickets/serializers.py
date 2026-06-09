from rest_framework import serializers

from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.core.mixins import user_is_project_member
from apps.core.permissions import can_approve_ticket, can_edit_ticket
from apps.projects.models import ProjectMember
from apps.tickets.models import Ticket


def validate_project_membership(user, project):
    if not project:
        raise serializers.ValidationError("Project is required.")
    if not user_is_project_member(user, project):
        raise serializers.ValidationError(
            "You must be a member of this project to work with its tickets."
        )
    return project


def validate_mentioned_user_in_project(project, mentioned_user):
    if not mentioned_user:
        return mentioned_user
    if not ProjectMember.objects.filter(project=project, user=mentioned_user).exists():
        raise serializers.ValidationError(
            {"mentioned_user": "Mentioned user must be a member of the selected project."}
        )
    return mentioned_user


class TicketSerializer(serializers.ModelSerializer):
    raised_by_detail = UserSerializer(source="raised_by", read_only=True)
    mentioned_user_detail = UserSerializer(source="mentioned_user", read_only=True)
    mentioned_department_detail = DepartmentSerializer(
        source="mentioned_department", read_only=True
    )
    last_edited_by_detail = UserSerializer(source="last_edited_by", read_only=True)
    approved_by_detail = UserSerializer(source="approved_by", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "title",
            "description",
            "request_type",
            "status",
            "project",
            "project_name",
            "raised_by",
            "raised_by_detail",
            "mentioned_user",
            "mentioned_user_detail",
            "mentioned_department",
            "mentioned_department_detail",
            "last_edited_by",
            "last_edited_by_detail",
            "approved_by",
            "approved_by_detail",
            "approved_at",
            "rejection_reason",
            "created_task",
            "created_bug",
            "can_edit",
            "can_approve",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "raised_by",
            "raised_by_detail",
            "last_edited_by",
            "last_edited_by_detail",
            "approved_by",
            "approved_by_detail",
            "approved_at",
            "rejection_reason",
            "created_task",
            "created_bug",
            "can_edit",
            "can_approve",
            "created_at",
            "updated_at",
            "project_name",
            "mentioned_user_detail",
            "mentioned_department_detail",
        )

    def get_can_edit(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return can_edit_ticket(request.user, obj)

    def get_can_approve(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return can_approve_ticket(request.user, obj)

    def validate_project(self, value):
        request = self.context.get("request")
        if request:
            return validate_project_membership(request.user, value)
        return value

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        mentioned_user = attrs.get(
            "mentioned_user", getattr(self.instance, "mentioned_user", None)
        )
        if project and mentioned_user is not None:
            validate_mentioned_user_in_project(project, mentioned_user)
        return attrs


class TicketListSerializer(serializers.ModelSerializer):
    raised_by_detail = UserSerializer(source="raised_by", read_only=True)
    mentioned_user_detail = UserSerializer(source="mentioned_user", read_only=True)
    mentioned_department_detail = DepartmentSerializer(
        source="mentioned_department", read_only=True
    )
    last_edited_by_detail = UserSerializer(source="last_edited_by", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id",
            "title",
            "request_type",
            "status",
            "project",
            "project_name",
            "raised_by",
            "raised_by_detail",
            "mentioned_user",
            "mentioned_user_detail",
            "mentioned_department",
            "mentioned_department_detail",
            "last_edited_by",
            "last_edited_by_detail",
            "updated_at",
            "created_at",
        )


class TicketUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = (
            "title",
            "description",
            "request_type",
            "project",
            "mentioned_user",
            "mentioned_department",
        )

    def validate_project(self, value):
        request = self.context.get("request")
        if request:
            return validate_project_membership(request.user, value)
        return value

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        mentioned_user = attrs.get(
            "mentioned_user", getattr(self.instance, "mentioned_user", None)
        )
        if "mentioned_user" in attrs and attrs["mentioned_user"] is None:
            mentioned_user = None
        if project and mentioned_user is not None:
            validate_mentioned_user_in_project(project, mentioned_user)
        return attrs


class TicketRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
