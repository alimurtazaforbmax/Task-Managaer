from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import Department, User


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "department", "is_active")
    list_filter = ("role", "department", "is_active")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("role", "department", "job_title")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Profile", {"fields": ("role", "department", "job_title")}),
    )
