from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.projects.models import Project, ProjectDocument, ProjectMember


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
        read_only_fields = ("id", "created_by", "created_at", "updated_at", "member_count", "task_count", "bug_count")


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
