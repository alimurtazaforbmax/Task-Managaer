from apps.accounts.models import Department, UserRole
from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.bugs.serializers import BugListSerializer
from apps.tasks.models import Task
from apps.tasks.serializers import TaskListSerializer

TASK_CLOSED_STATUSES = ("done", "cancelled")

PERMISSION_FIELDS = (
    ("can_create_tasks", "Create tasks"),
    ("can_create_bugs", "Create bugs"),
    ("can_edit_tasks", "Edit tasks"),
    ("can_edit_bugs", "Edit bugs"),
)


def build_department_summary(department: Department, request) -> dict:
    context = {"request": request}
    members = department.members.select_related("department").order_by(
        "first_name", "last_name", "username"
    )
    member_ids = list(members.values_list("id", flat=True))

    dept_tasks = Task.objects.filter(assignee_department=department)
    dept_bugs = Bug.objects.filter(assignee_department=department)
    member_tasks = Task.objects.filter(assignees__in=member_ids).distinct()
    member_bugs = Bug.objects.filter(assignees__in=member_ids).distinct()

    role_breakdown = {
        role: members.filter(role=role).count() for role, _ in UserRole.choices
    }
    role_breakdown = {k: v for k, v in role_breakdown.items() if v > 0}

    recent_tasks = (
        member_tasks.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )
    recent_bugs = (
        member_bugs.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )

    permissions = [
        {
            "key": key,
            "label": label,
            "enabled": bool(getattr(department, key)),
        }
        for key, label in PERMISSION_FIELDS
    ]

    return {
        "department": DepartmentSerializer(department, context=context).data,
        "permissions": permissions,
        "stats": {
            "member_count": members.count(),
            "active_members": members.filter(is_active=True).count(),
            "inactive_members": members.filter(is_active=False).count(),
            "department_tasks": dept_tasks.count(),
            "open_department_tasks": dept_tasks.exclude(
                status__in=TASK_CLOSED_STATUSES
            ).count(),
            "department_bugs": dept_bugs.count(),
            "open_department_bugs": dept_bugs.exclude(
                status__in=BUG_CLOSED_STATUSES
            ).count(),
            "member_open_tasks": member_tasks.exclude(
                status__in=TASK_CLOSED_STATUSES
            ).count(),
            "member_open_bugs": member_bugs.exclude(
                status__in=BUG_CLOSED_STATUSES
            ).count(),
        },
        "role_breakdown": role_breakdown,
        "members": UserSerializer(members, many=True, context=context).data,
        "recent_tasks": TaskListSerializer(
            recent_tasks, many=True, context=context
        ).data,
        "recent_bugs": BugListSerializer(recent_bugs, many=True, context=context).data,
    }
