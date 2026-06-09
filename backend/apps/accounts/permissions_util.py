from apps.accounts.permission_registry import (
    DEPARTMENT_OVERLAY_CODENAMES,
    PERMISSION_REGISTRY,
    all_codenames,
)


def get_user_permissions(user) -> dict[str, bool]:
    base = {codename: False for codename in all_codenames()}
    if not user or not user.is_authenticated:
        return base

    role = getattr(user, "access_role", None)
    if role and role.is_admin:
        return {codename: True for codename in all_codenames()}

    if role:
        for codename in role.permissions.values_list("codename", flat=True):
            if codename in base:
                base[codename] = True

    department = getattr(user, "department", None)
    if department:
        for codename in department.extra_permissions.filter(
            codename__in=DEPARTMENT_OVERLAY_CODENAMES
        ).values_list("codename", flat=True):
            if codename in base:
                base[codename] = True

    return base


def user_has_permission(user, permission: str) -> bool:
    return get_user_permissions(user).get(permission, False)


def is_admin_user(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    role = getattr(user, "access_role", None)
    return bool(role and role.is_admin)


def user_role_slug(user) -> str:
    role = getattr(user, "access_role", None)
    return role.slug if role else "developer"


def permission_catalog() -> list[dict]:
    return list(PERMISSION_REGISTRY)
