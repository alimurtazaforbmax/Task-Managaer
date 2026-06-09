from apps.accounts.models import Department, Role
from apps.accounts.serializers import DepartmentSerializer, UserSerializer
from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.bugs.serializers import BugListSerializer
from apps.tasks.models import Task
from apps.tasks.serializers import TaskListSerializer

TASK_CLOSED_STATUSES = ("done", "cancelled")


def build_department_summary(department: Department, request) -> dict:
    context = {"request": request}
    members = department.members.select_related("department", "access_role").order_by(
        "first_name", "last_name", "username"
    )
    member_ids = list(members.values_list("id", flat=True))

    dept_tasks = Task.objects.filter(assignee_department=department)
    dept_bugs = Bug.objects.filter(assignee_department=department)
    member_tasks = Task.objects.filter(assignees__in=member_ids).distinct()
    member_bugs = Bug.objects.filter(assignees__in=member_ids).distinct()

    role_breakdown = {}
    for role in Role.objects.all():
        count = members.filter(access_role=role).count()
        if count:
            role_breakdown[role.slug] = count

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
            "key": perm.codename,
            "label": perm.name,
            "enabled": True,
        }
        for perm in department.extra_permissions.all()
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
