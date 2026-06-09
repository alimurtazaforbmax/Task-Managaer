from django.db.models import Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.bugs.serializers import BugListSerializer
from apps.core.models import TimeEntry
from apps.projects.models import ProjectMember
from apps.tasks.models import Task
from apps.tasks.serializers import TaskListSerializer

TASK_CLOSED_STATUSES = ("done", "cancelled")


def build_user_summary(user: User, request) -> dict:
    today = timezone.now().date()
    context = {"request": request}

    assigned_tasks = Task.objects.filter(assignees=user)
    assigned_bugs = Bug.objects.filter(assignees=user)

    time_agg = TimeEntry.objects.filter(user=user).aggregate(total=Sum("minutes"))
    task_time = (
        TimeEntry.objects.filter(user=user, task__isnull=False).aggregate(
            total=Sum("minutes")
        )["total"]
        or 0
    )
    bug_time = (
        TimeEntry.objects.filter(user=user, bug__isnull=False).aggregate(
            total=Sum("minutes")
        )["total"]
        or 0
    )
    total_minutes = time_agg["total"] or 0

    memberships = (
        ProjectMember.objects.filter(user=user)
        .select_related("project")
        .order_by("project__name")
    )
    projects = [
        {
            "id": membership.project_id,
            "name": membership.project.name,
            "code": membership.project.code,
            "status": membership.project.status,
            "role": membership.role,
            "joined_at": membership.joined_at,
        }
        for membership in memberships
    ]

    recent_tasks = (
        assigned_tasks.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )
    recent_bugs = (
        assigned_bugs.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )

    return {
        "stats": {
            "total_hours": round(total_minutes / 60, 1),
            "task_hours": round(task_time / 60, 1),
            "bug_hours": round(bug_time / 60, 1),
            "assigned_tasks": assigned_tasks.count(),
            "open_tasks": assigned_tasks.exclude(
                status__in=TASK_CLOSED_STATUSES
            ).count(),
            "overdue_tasks": assigned_tasks.filter(
                due_date__isnull=False,
                due_date__lt=today,
            )
            .exclude(status__in=TASK_CLOSED_STATUSES)
            .count(),
            "completed_tasks": assigned_tasks.filter(status="done").count(),
            "assigned_bugs": assigned_bugs.count(),
            "open_bugs": assigned_bugs.exclude(
                status__in=BUG_CLOSED_STATUSES
            ).count(),
            "completed_bugs": assigned_bugs.filter(
                status__in=BUG_CLOSED_STATUSES
            ).count(),
            "reported_tasks": Task.objects.filter(reporter=user).count(),
            "reported_bugs": Bug.objects.filter(reporter=user).count(),
            "projects_count": memberships.count(),
        },
        "projects": projects,
        "recent_tasks": TaskListSerializer(
            recent_tasks, many=True, context=context
        ).data,
        "recent_bugs": BugListSerializer(
            recent_bugs, many=True, context=context
        ).data,
    }
