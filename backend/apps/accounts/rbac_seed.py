from apps.accounts.models import Permission, Role
from apps.accounts.permission_registry import PERMISSION_REGISTRY, SYSTEM_ROLES


def sync_permissions() -> dict[str, Permission]:
    by_codename: dict[str, Permission] = {}
    for item in PERMISSION_REGISTRY:
        perm, _ = Permission.objects.update_or_create(
            codename=item["codename"],
            defaults={
                "name": item["name"],
                "category": item["category"],
                "description": item.get("description", ""),
            },
        )
        by_codename[perm.codename] = perm
    return by_codename


def sync_system_roles(permissions: dict[str, Permission] | None = None) -> dict[str, Role]:
    if permissions is None:
        permissions = sync_permissions()
    by_slug: dict[str, Role] = {}
    for spec in SYSTEM_ROLES:
        role, _ = Role.objects.update_or_create(
            slug=spec["slug"],
            defaults={
                "name": spec["name"],
                "description": spec.get("description", ""),
                "is_system": spec.get("is_system", False),
                "is_admin": spec.get("is_admin", False),
            },
        )
        if not role.is_admin:
            role.permissions.set(
                [permissions[c] for c in spec.get("permissions", []) if c in permissions]
            )
        else:
            role.permissions.clear()
        by_slug[role.slug] = role
    return by_slug
