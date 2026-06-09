from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import Department, Permission, Role, User


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name", "category")
    list_filter = ("category",)
    search_fields = ("codename", "name")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_system", "is_admin")
    list_filter = ("is_system", "is_admin")
    search_fields = ("name", "slug")
    filter_horizontal = ("permissions",)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "member_count_display", "created_at")
    search_fields = ("name",)
    filter_horizontal = ("extra_permissions",)

    @admin.display(description="Members")
    def member_count_display(self, obj):
        return obj.members.count()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "access_role", "department", "is_active")
    list_filter = ("access_role", "department", "is_active")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("access_role", "department", "job_title", "profile_picture")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Profile", {"fields": ("access_role", "department", "job_title")}),
    )
