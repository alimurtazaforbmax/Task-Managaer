from django.conf import settings
from django.db import models

from apps.accounts.models import Department
from apps.projects.models import Project


class TicketRequestType(models.TextChoices):
    TASK = "task", "Task request"
    BUG = "bug", "Bug report"
    ISSUE = "issue", "General issue"
    OTHER = "other", "Other"


class TicketStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class Ticket(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    request_type = models.CharField(
        max_length=16,
        choices=TicketRequestType.choices,
        default=TicketRequestType.ISSUE,
    )
    status = models.CharField(
        max_length=16,
        choices=TicketStatus.choices,
        default=TicketStatus.PENDING,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tickets",
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="raised_tickets",
    )
    mentioned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mentioned_in_tickets",
    )
    mentioned_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mentioned_in_tickets",
    )
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="last_edited_tickets",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_tickets",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_ticket",
    )
    created_bug = models.ForeignKey(
        "bugs.Bug",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_ticket",
    )
    source_test_case = models.ForeignKey(
        "projects.TestCase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
