from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.core.mixins import member_project_ids
from apps.projects.models import ProjectMember, ProjectMemberRole


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


def managed_project_ids(user) -> list[int]:
    """Projects where the user is a project member with the PM role."""
    return list(
        ProjectMember.objects.filter(
            user=user,
            role=ProjectMemberRole.PM,
        ).values_list("project_id", flat=True)
    )


def actor_team_project_ids(user) -> list[int]:
    """Projects a user may oversee in team/report views."""
    if can_view_org_wide_users(user):
        from apps.core.mixins import user_project_ids

        return list(user_project_ids(user))
    return managed_project_ids(user)


def teammate_user_ids(user) -> list[int]:
    project_ids = actor_team_project_ids(user)
    if not project_ids:
        return []
    return list(
        ProjectMember.objects.filter(project_id__in=project_ids)
        .values_list("user_id", flat=True)
        .distinct()
    )


def users_share_project(actor, target) -> bool:
    """Whether the actor may view the target in a managed project context."""
    if not actor or not target:
        return False
    if actor.pk == target.pk:
        return True
    if can_view_org_wide_users(actor):
        actor_projects = set(member_project_ids(actor))
        target_projects = set(member_project_ids(target))
        return bool(actor_projects & target_projects)
    managed = set(managed_project_ids(actor))
    if not managed:
        return False
    target_projects = set(member_project_ids(target))
    return bool(managed & target_projects)
