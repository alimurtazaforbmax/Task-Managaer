from django.contrib import admin

from apps.core.models import (
    ActivityLog,
    Attachment,
    AuditLog,
    Comment,
    Notification,
    TimeEntry,
)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "comment_type", "created_at")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("original_name", "attachment_type", "uploaded_by", "created_at")


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "minutes", "work_date")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "created_at")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity_type", "entity_label", "actor", "created_at")
    list_filter = ("action", "entity_type")
    search_fields = ("entity_label", "detail")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "is_read", "created_at")
