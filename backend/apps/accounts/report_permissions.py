from apps.accounts.models import User
from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.core.mixins import user_is_project_member


def can_view_users_list(user) -> bool:
    if is_admin_user(user):
        return True
    return user_has_permission(user, "can_view_users") or user_has_permission(
        user, "can_manage_users"
    )


def can_view_user_profile(actor, target: User) -> bool:
    if not actor or not actor.is_authenticated:
        return False
    if is_admin_user(actor):
        return True
    if actor.pk == target.pk:
        return True
    return user_has_permission(actor, "can_view_user_details")


def can_generate_user_report(actor, target: User) -> bool:
    if not actor or not actor.is_authenticated:
        return False
    if is_admin_user(actor):
        return True
    if not can_view_user_profile(actor, target):
        return False
    if actor.pk == target.pk:
        return True
    return user_has_permission(actor, "can_generate_user_reports")


def can_generate_project_report(actor, project) -> bool:
    if not actor or not actor.is_authenticated:
        return False
    if is_admin_user(actor):
        return True
    if not user_has_permission(actor, "can_generate_project_reports"):
        return False
    return user_is_project_member(actor, project)
