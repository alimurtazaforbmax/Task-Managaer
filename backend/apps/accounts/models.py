from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    PROJECT_MANAGER = "project_manager", "Project Manager"
    DEVELOPER = "developer", "Developer"
    QA = "qa", "QA"
    VIEWER = "viewer", "Viewer"


class Department(models.Model):
    name = models.CharField(max_length=128, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    role = models.CharField(
        max_length=32,
        choices=UserRole.choices,
        default=UserRole.DEVELOPER,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    job_title = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return self.get_full_name() or self.username
