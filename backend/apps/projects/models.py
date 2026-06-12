from django.conf import settings
from django.db import models

from apps.core.utils import unique_upload_path


class ProjectStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ON_HOLD = "on_hold", "On Hold"
    ARCHIVED = "archived", "Archived"


class ProjectMemberRole(models.TextChoices):
    PM = "pm", "Project Manager"
    DEVELOPER = "developer", "Developer"
    QA = "qa", "QA"
    VIEWER = "viewer", "Viewer"


class Project(models.Model):
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(
        max_length=32,
        choices=ProjectMemberRole.choices,
        default=ProjectMemberRole.DEVELOPER,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} @ {self.project}"


def project_document_upload_to(instance, filename):
    return unique_upload_path(f"projects/{instance.project_id}/documents", filename)


class FeatureStatus(models.TextChoices):
    BACKLOG = "backlog", "Backlog"
    PLANNED = "planned", "Planned"
    IN_PROGRESS = "in_progress", "In Progress"
    DONE = "done", "Done"
    CANCELLED = "cancelled", "Cancelled"


class FeaturePriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class Feature(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="features"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=FeatureStatus.choices,
        default=FeatureStatus.BACKLOG,
    )
    priority = models.CharField(
        max_length=16,
        choices=FeaturePriority.choices,
        default=FeaturePriority.MEDIUM,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="owned_features",
    )
    target_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_features",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class SprintStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class Sprint(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="sprints"
    )
    name = models.CharField(max_length=255)
    goal = models.TextField(blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=SprintStatus.choices,
        default=SprintStatus.PLANNED,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_sprints",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-updated_at"]

    def __str__(self):
        return self.name


class TestCaseStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    READY = "ready", "Ready"
    IN_PROGRESS = "in_progress", "In Progress"
    PASSED = "passed", "Passed"
    FAILED = "failed", "Failed"
    BLOCKED = "blocked", "Blocked"
    DEPRECATED = "deprecated", "Deprecated"


class TestCasePriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class TestCaseType(models.TextChoices):
    FUNCTIONAL = "functional", "Functional"
    REGRESSION = "regression", "Regression"
    SMOKE = "smoke", "Smoke"
    INTEGRATION = "integration", "Integration"
    UAT = "uat", "UAT"
    OTHER = "other", "Other"


class TestCase(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="test_cases"
    )
    feature = models.ForeignKey(
        Feature,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_cases",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    preconditions = models.TextField(blank=True)
    steps = models.TextField(blank=True)
    expected_result = models.TextField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=TestCaseStatus.choices,
        default=TestCaseStatus.DRAFT,
    )
    priority = models.CharField(
        max_length=16,
        choices=TestCasePriority.choices,
        default=TestCasePriority.MEDIUM,
    )
    test_type = models.CharField(
        max_length=32,
        choices=TestCaseType.choices,
        default=TestCaseType.FUNCTIONAL,
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_test_cases",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_test_cases",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class ProjectDocument(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="documents"
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=project_document_upload_to)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_project_documents",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
