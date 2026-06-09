from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.core.models import (
    ActivityLog,
    Attachment,
    AuditLog,
    Comment,
    Notification,
    TimeEntry,
)


class CommentSerializer(serializers.ModelSerializer):
    author_detail = UserSerializer(source="author", read_only=True)

    class Meta:
        model = Comment
        fields = (
            "id",
            "task",
            "bug",
            "author",
            "author_detail",
            "text",
            "comment_type",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "author_detail", "created_at", "updated_at")


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_detail = UserSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = Attachment
        fields = (
            "id",
            "task",
            "bug",
            "file",
            "file_url",
            "original_name",
            "mime_type",
            "size_bytes",
            "attachment_type",
            "uploaded_by",
            "uploaded_by_detail",
            "created_at",
        )
        read_only_fields = (
            "id",
            "file_url",
            "original_name",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "uploaded_by_detail",
            "created_at",
        )

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class TimeEntrySerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model = TimeEntry
        fields = (
            "id",
            "task",
            "bug",
            "user",
            "user_detail",
            "minutes",
            "work_date",
            "note",
            "created_at",
        )
        read_only_fields = ("id", "user", "user_detail", "created_at")


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source="actor", read_only=True)

    class Meta:
        model = ActivityLog
        fields = ("id", "task", "bug", "actor", "actor_detail", "action", "detail", "created_at")
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source="actor", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_detail",
            "action",
            "entity_type",
            "entity_id",
            "entity_label",
            "detail",
            "changes",
            "created_at",
        )
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "link", "is_read", "created_at")
        read_only_fields = ("id", "title", "message", "link", "created_at")


class PushSubscribeSerializer(serializers.Serializer):
    endpoint = serializers.CharField()
    keys = serializers.DictField(child=serializers.CharField())

    def validate_keys(self, value):
        if "p256dh" not in value or "auth" not in value:
            raise serializers.ValidationError("keys must include p256dh and auth.")
        return value


class PushUnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.CharField()
