from django.conf import settings
from django.db import models

from apps.accounts.models import Department
from apps.projects.models import Project


class BugStatus(models.TextChoices):
    OPEN = "open", "Open"
    TRIAGED = "triaged", "Triaged"
    IN_PROGRESS = "in_progress", "In Progress"
    FIXED = "fixed", "Fixed"
    QA_VERIFICATION = "qa_verification", "QA Verification"
    CLOSED = "closed", "Closed"
    REJECTED = "rejected", "Rejected"


class BugSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class BugPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class Bug(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="bugs"
    )
    related_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_bugs",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    steps_to_reproduce = models.TextField(blank=True)
    environment = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=32,
        choices=BugStatus.choices,
        default=BugStatus.OPEN,
    )
    severity = models.CharField(
        max_length=16,
        choices=BugSeverity.choices,
        default=BugSeverity.MEDIUM,
    )
    priority = models.CharField(
        max_length=16,
        choices=BugPriority.choices,
        default=BugPriority.MEDIUM,
    )
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="assigned_bugs",
    )
    assignee_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="department_bugs",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_bugs",
    )
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    tags = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
