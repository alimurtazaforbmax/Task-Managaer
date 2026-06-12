from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.core.mixins import member_project_ids
from apps.projects.models import ProjectMember


def can_view_team(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_admin_user(user):
        return True
    return user_has_permission(user, "can_view_team")


def can_view_org_wide_users(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_admin_user(user):
        return True
    return user_has_permission(user, "can_view_users") or user_has_permission(
        user, "can_manage_users"
    )


def teammate_user_ids(user) -> list[int]:
    project_ids = list(member_project_ids(user))
    if not project_ids:
        return []
    return list(
        ProjectMember.objects.filter(project_id__in=project_ids)
        .values_list("user_id", flat=True)
        .distinct()
    )


def users_share_project(actor, target) -> bool:
    if not actor or not target:
        return False
    if actor.pk == target.pk:
        return True
    actor_projects = set(member_project_ids(actor))
    target_projects = set(member_project_ids(target))
    return bool(actor_projects & target_projects)
