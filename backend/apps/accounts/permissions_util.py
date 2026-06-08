DEPARTMENT_PERMISSION_FIELDS = (
    "can_create_tasks",
    "can_create_bugs",
    "can_edit_tasks",
    "can_edit_bugs",
)


def get_department_permissions(user) -> dict[str, bool]:
    base = {field: False for field in DEPARTMENT_PERMISSION_FIELDS}
    if not user or not user.is_authenticated:
        return base
    if user.role == "admin":
        return {field: True for field in DEPARTMENT_PERMISSION_FIELDS}
    department = getattr(user, "department", None)
    if not department:
        return base
    return {
        field: getattr(department, field, False)
        for field in DEPARTMENT_PERMISSION_FIELDS
    }


def user_has_permission(user, permission: str) -> bool:
    return get_department_permissions(user).get(permission, False)
