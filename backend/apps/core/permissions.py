from rest_framework.permissions import BasePermission

from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.projects.models import ProjectMember


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin_user(request.user)


class IsAdminOrProjectManager(BasePermission):
    def has_permission(self, request, view):
        return user_has_permission(request.user, "can_approve_tickets")


class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin_user(request.user):
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
    if is_admin_user(user):
        return True
    return obj.reporter_id == user.id


def can_edit_work_item(user, obj, permission_codename: str) -> bool:
    if is_owner_or_admin(user, obj):
        return True
    return user_has_permission(user, permission_codename)


def is_admin_or_project_manager(user) -> bool:
    return user_has_permission(user, "can_approve_tickets")


def can_edit_ticket(user, ticket) -> bool:
    if not user or not user.is_authenticated:
        return False
    if ticket.raised_by_id == user.id:
        return True
    return user_has_permission(user, "can_edit_tickets")


def can_approve_ticket(user, ticket) -> bool:
    if not user or not user.is_authenticated:
        return False
    if ticket.status != "pending":
        return False
    return user_has_permission(user, "can_approve_tickets")


def can_delete_attachment(user, attachment, parent_obj) -> bool:
    if is_admin_user(user):
        return True
    if parent_obj.reporter_id == user.id:
        return True
    if attachment.uploaded_by_id == user.id:
        return True
    return False
