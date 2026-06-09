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


def can_change_status(user, obj) -> bool:
    """Only the reporter (creator) or assignees may change status."""
    if not user or not user.is_authenticated:
        return False
    if obj.reporter_id == user.id:
        return True
    if obj.assignees.filter(pk=user.pk).exists():
        return True
    return False


def is_owner_or_admin(user, obj) -> bool:
    if user.role == "admin":
        return True
    return obj.reporter_id == user.id


def is_admin_or_project_manager(user) -> bool:
    return (
        user
        and user.is_authenticated
        and user.role in ("admin", "project_manager")
    )


def can_edit_ticket(user, ticket) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_admin_or_project_manager(user):
        return True
    return ticket.raised_by_id == user.id


def can_approve_ticket(user, ticket) -> bool:
    if not user or not user.is_authenticated:
        return False
    if not is_admin_or_project_manager(user):
        return False
    return ticket.status == "pending"


def can_delete_attachment(user, attachment, parent_obj) -> bool:
    if user.role == "admin":
        return True
    if parent_obj.reporter_id == user.id:
        return True
    if attachment.uploaded_by_id == user.id:
        return True
    return False
