from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.utils import unique_upload_path


def user_profile_upload_to(instance, filename):
    return unique_upload_path(f"profiles/{instance.pk or 'new'}", filename)


class Permission(models.Model):
    codename = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    category = models.CharField(max_length=64)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


class Role(models.Model):
    name = models.CharField(max_length=128)
    slug = models.SlugField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name="roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=128, unique=True)
    description = models.TextField(blank=True)
    extra_permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name="departments",
        help_text="Additional permissions granted to all department members.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    access_role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    job_title = models.CharField(max_length=128, blank=True)
    profile_picture = models.ImageField(
        upload_to=user_profile_upload_to,
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def role(self) -> str:
        """Backward-compatible role slug for legacy callers."""
        if self.access_role_id:
            return self.access_role.slug
        return "developer"
