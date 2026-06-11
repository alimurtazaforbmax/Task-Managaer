from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.projects.models import (
    Feature,
    Project,
    ProjectDocument,
    ProjectMember,
    ProjectMemberRole,
    Sprint,
)


def project_role_for_user(user: User) -> str:
    mapping = {
        "admin": ProjectMemberRole.PM,
        "project_manager": ProjectMemberRole.PM,
        "team_lead": ProjectMemberRole.PM,
        "developer": ProjectMemberRole.DEVELOPER,
        "qa": ProjectMemberRole.QA,
        "viewer": ProjectMemberRole.VIEWER,
    }
    slug = user.access_role.slug if user.access_role_id else "developer"
    return mapping.get(slug, ProjectMemberRole.DEVELOPER)


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ("id", "project", "user", "user_detail", "role", "joined_at")
        read_only_fields = ("id", "joined_at", "user_detail")


class ProjectSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)
    bug_count = serializers.IntegerField(source="bugs.count", read_only=True)
    feature_count = serializers.IntegerField(source="features.count", read_only=True)
    sprint_count = serializers.IntegerField(source="sprints.count", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "code",
            "description",
            "status",
            "start_date",
            "end_date",
            "created_by",
            "member_count",
            "task_count",
            "bug_count",
            "feature_count",
            "sprint_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "member_count",
            "task_count",
            "bug_count",
            "feature_count",
            "sprint_count",
        )


class ProjectDetailSerializer(ProjectSerializer):
    """Project detail — members are loaded via /projects/{id}/members/ (paginated)."""

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields


class ProjectWriteSerializer(serializers.ModelSerializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        allow_empty=True,
    )

    class Meta:
        model = Project
        fields = (
            "name",
            "code",
            "description",
            "status",
            "start_date",
            "end_date",
            "member_ids",
        )

    def _sync_members(self, project: Project, member_ids: list[int], creator) -> None:
        member_ids = list(dict.fromkeys(member_ids))
        if creator and creator.id not in member_ids:
            member_ids.append(creator.id)

        desired_ids = set(member_ids)
        current_ids = set(project.members.values_list("user_id", flat=True))

        project.members.filter(user_id__in=current_ids - desired_ids).delete()

        for user_id in member_ids:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                continue
            if creator and user_id == creator.id:
                role = ProjectMemberRole.PM
            else:
                role = project_role_for_user(user)
            ProjectMember.objects.update_or_create(
                project=project,
                user_id=user_id,
                defaults={"role": role},
            )

    @transaction.atomic
    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", [])
        request = self.context.get("request")
        creator = request.user if request else None
        project = Project.objects.create(
            created_by=creator,
            **validated_data,
        )
        self._sync_members(project, member_ids, creator)
        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if member_ids is not None:
            request = self.context.get("request")
            creator = instance.created_by or (request.user if request else None)
            self._sync_members(instance, member_ids, creator)

        return instance


class ProjectDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectDocument
        fields = (
            "id",
            "project",
            "title",
            "file",
            "file_url",
            "original_name",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "created_at",
        )
        read_only_fields = (
            "id",
            "original_name",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "created_at",
            "file_url",
        )

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class FeatureListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    owner_detail = UserSerializer(source="owner", read_only=True)
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)

    class Meta:
        model = Feature
        fields = (
            "id",
            "project",
            "project_name",
            "title",
            "status",
            "priority",
            "owner",
            "owner_detail",
            "target_date",
            "task_count",
            "updated_at",
        )


class FeatureSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    owner_detail = UserSerializer(source="owner", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)
    completed_task_count = serializers.SerializerMethodField()

    class Meta:
        model = Feature
        fields = (
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "priority",
            "owner",
            "owner_detail",
            "created_by",
            "created_by_detail",
            "target_date",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "created_by_detail",
            "project_name",
            "owner_detail",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        )

    def get_completed_task_count(self, obj) -> int:
        return obj.tasks.filter(status="done").count()


class FeatureUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = (
            "title",
            "description",
            "status",
            "priority",
            "owner",
            "target_date",
        )


class SprintListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)

    class Meta:
        model = Sprint
        fields = (
            "id",
            "project",
            "project_name",
            "name",
            "status",
            "start_date",
            "end_date",
            "task_count",
            "updated_at",
        )


class SprintSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)
    completed_task_count = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = (
            "id",
            "project",
            "project_name",
            "name",
            "goal",
            "description",
            "status",
            "start_date",
            "end_date",
            "created_by",
            "created_by_detail",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "created_by_detail",
            "project_name",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        )

    def get_completed_task_count(self, obj) -> int:
        return obj.tasks.filter(status="done").count()


class SprintUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = (
            "name",
            "goal",
            "description",
            "status",
            "start_date",
            "end_date",
        )

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError("End date must be on or after start date.")
        return attrs
