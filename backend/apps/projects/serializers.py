from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.projects.models import Project, ProjectDocument, ProjectMember, ProjectMemberRole


def project_role_for_user(user: User) -> str:
    mapping = {
        "admin": ProjectMemberRole.PM,
        "project_manager": ProjectMemberRole.PM,
        "developer": ProjectMemberRole.DEVELOPER,
        "qa": ProjectMemberRole.QA,
        "viewer": ProjectMemberRole.VIEWER,
    }
    return mapping.get(user.role, ProjectMemberRole.DEVELOPER)


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
        )


class ProjectDetailSerializer(ProjectSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ("members",)


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
