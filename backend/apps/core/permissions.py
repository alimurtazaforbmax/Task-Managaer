from rest_framework.permissions import BasePermission

from apps.projects.models import ProjectMember


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsAdminOrProjectManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "project_manager")
        )


class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        project = getattr(obj, "project", obj)
        return ProjectMember.objects.filter(
            project=project, user=request.user
        ).exists()


def is_owner_or_admin(user, obj) -> bool:
    if user.role == "admin":
        return True
    return obj.reporter_id == user.id


def can_delete_attachment(user, attachment, parent_obj) -> bool:
    if user.role == "admin":
        return True
    if parent_obj.reporter_id == user.id:
        return True
    if attachment.uploaded_by_id == user.id:
        return True
    return False
