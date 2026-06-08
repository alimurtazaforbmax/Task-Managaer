from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.utils import unique_upload_path


class CommentType(models.TextChoices):
    GENERAL = "general", "General"
    REJECTION_REASON = "rejection_reason", "Rejection Reason"
    RESOLUTION_NOTE = "resolution_note", "Resolution Note"


class AttachmentType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    DOCUMENT = "document", "Document"


class Comment(models.Model):
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    bug = models.ForeignKey(
        "bugs.Bug",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    text = models.TextField()
    comment_type = models.CharField(
        max_length=32,
        choices=CommentType.choices,
        default=CommentType.GENERAL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def clean(self):
        if bool(self.task) == bool(self.bug):
            raise ValidationError("Comment must belong to exactly one task or bug.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


def attachment_upload_to(instance, filename):
    folder = "attachments/tasks"
    if instance.bug_id:
        folder = "attachments/bugs"
    return unique_upload_path(folder, filename)


class Attachment(models.Model):
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    bug = models.ForeignKey(
        "bugs.Bug",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    file = models.FileField(upload_to=attachment_upload_to)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    attachment_type = models.CharField(max_length=16, choices=AttachmentType.choices)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if bool(self.task) == bool(self.bug):
            raise ValidationError("Attachment must belong to exactly one task or bug.")


class TimeEntry(models.Model):
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="time_entries",
    )
    bug = models.ForeignKey(
        "bugs.Bug",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="time_entries",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="time_entries",
    )
    minutes = models.PositiveIntegerField()
    work_date = models.DateField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-work_date", "-created_at"]

    def clean(self):
        if bool(self.task) == bool(self.bug):
            raise ValidationError("Time entry must belong to exactly one task or bug.")


class ActivityLog(models.Model):
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    bug = models.ForeignKey(
        "bugs.Bug",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    action = models.CharField(max_length=64)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=512, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
