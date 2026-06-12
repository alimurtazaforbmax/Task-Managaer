from django.db.models import Q, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.bugs.serializers import BugListSerializer
from apps.core.models import TimeEntry
from apps.core.report_periods import normalize_report_period, resolve_report_period
from apps.accounts.team_permissions import can_view_org_wide_users, managed_project_ids
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task
from apps.tasks.serializers import TaskListSerializer

TASK_CLOSED_STATUSES = ("done", "cancelled")


def _user_member_project_ids(user: User) -> list[int]:
    return list(
        ProjectMember.objects.filter(user=user).values_list("project_id", flat=True)
    )


def resolve_user_project_scope(
    user: User, requested_ids: list[int] | None
) -> tuple[list[int], bool]:
    """Return (project_ids in scope, whether a subset was explicitly requested)."""
    member_ids = _user_member_project_ids(user)
    if not requested_ids:
        return member_ids, False
    allowed = set(member_ids)
    scoped = [pid for pid in requested_ids if pid in allowed]
    return scoped, True


def resolve_viewer_report_scope(
    viewer: User | None,
    target: User,
    requested_ids: list[int] | None,
) -> tuple[list[int], bool]:
    """Apply viewer permissions to the target user's report project scope."""
    scope_ids, filtered_subset = resolve_user_project_scope(target, requested_ids)

    if not viewer or viewer.pk == target.pk or can_view_org_wide_users(viewer):
        return scope_ids, filtered_subset

    managed = set(managed_project_ids(viewer))
    scoped = [pid for pid in scope_ids if pid in managed]
    return scoped, True


def _apply_period_date_filter(qs, field: str, start, end):
    if start and end:
        return qs.filter(**{f"{field}__gte": start, f"{field}__lte": end})
    return qs


def _project_work_stats(user: User, project_id: int, start, end) -> dict:
    assigned_tasks = Task.objects.filter(assignees=user, project_id=project_id)
    assigned_bugs = Bug.objects.filter(assignees=user, project_id=project_id)

    time_qs = TimeEntry.objects.filter(user=user).filter(
        Q(task__project_id=project_id) | Q(bug__project_id=project_id)
    )
    if start and end:
        time_qs = time_qs.filter(work_date__gte=start, work_date__lte=end)

    total_minutes = time_qs.aggregate(total=Sum("minutes"))["total"] or 0
    task_minutes = (
        time_qs.filter(task__isnull=False).aggregate(total=Sum("minutes"))["total"] or 0
    )
    bug_minutes = (
        time_qs.filter(bug__isnull=False).aggregate(total=Sum("minutes"))["total"] or 0
    )

    tasks_touched = _apply_period_date_filter(assigned_tasks, "updated_at__date", start, end)
    bugs_touched = _apply_period_date_filter(assigned_bugs, "updated_at__date", start, end)

    completed_tasks = assigned_tasks.filter(status="done")
    completed_bugs = assigned_bugs.filter(status__in=BUG_CLOSED_STATUSES)
    completed_tasks = _apply_period_date_filter(completed_tasks, "updated_at__date", start, end)
    completed_bugs = _apply_period_date_filter(completed_bugs, "updated_at__date", start, end)

    return {
        "hours_logged": round(total_minutes / 60, 1),
        "task_hours": round(task_minutes / 60, 1),
        "bug_hours": round(bug_minutes / 60, 1),
        "assigned_tasks": tasks_touched.count() if start else assigned_tasks.count(),
        "assigned_bugs": bugs_touched.count() if start else assigned_bugs.count(),
        "completed_tasks": completed_tasks.count(),
        "completed_bugs": completed_bugs.count(),
    }


def build_project_breakdown(
    user: User, project_ids: list[int], start, end
) -> list[dict]:
    if not project_ids:
        return []

    projects = Project.objects.filter(id__in=project_ids).order_by("name")
    breakdown = []
    for project in projects:
        stats = _project_work_stats(user, project.id, start, end)
        breakdown.append(
            {
                "id": project.id,
                "name": project.name,
                "code": project.code,
                "status": project.status,
                **stats,
            }
        )
    return breakdown


def build_user_summary(
    user: User,
    request,
    period: str | None = None,
    project_ids: list[int] | None = None,
    reference=None,
    viewer: User | None = None,
) -> dict:
    today = timezone.now().date()
    context = {"request": request}
    normalized = normalize_report_period(period)
    start, end, period_label = resolve_report_period(normalized, reference)
    anchor = reference or today
    viewer = viewer or getattr(request, "user", None)

    scope_ids, filtered_subset = resolve_viewer_report_scope(
        viewer, user, project_ids
    )

    assigned_tasks = Task.objects.filter(assignees=user)
    assigned_bugs = Bug.objects.filter(assignees=user)
    if scope_ids:
        assigned_tasks = assigned_tasks.filter(project_id__in=scope_ids)
        assigned_bugs = assigned_bugs.filter(project_id__in=scope_ids)
    elif filtered_subset:
        assigned_tasks = assigned_tasks.none()
        assigned_bugs = assigned_bugs.none()

    time_qs = TimeEntry.objects.filter(user=user)
    if scope_ids:
        time_qs = time_qs.filter(
            Q(task__project_id__in=scope_ids) | Q(bug__project_id__in=scope_ids)
        )
    elif filtered_subset:
        time_qs = time_qs.none()

    if start and end:
        time_qs = time_qs.filter(work_date__gte=start, work_date__lte=end)

    time_agg = time_qs.aggregate(total=Sum("minutes"))
    task_time = (
        time_qs.filter(task__isnull=False).aggregate(total=Sum("minutes"))["total"] or 0
    )
    bug_time = (
        time_qs.filter(bug__isnull=False).aggregate(total=Sum("minutes"))["total"] or 0
    )
    total_minutes = time_agg["total"] or 0

    tasks_in_period = assigned_tasks
    bugs_in_period = assigned_bugs
    if start and end:
        tasks_in_period = assigned_tasks.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )
        bugs_in_period = assigned_bugs.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )

    reported_tasks_qs = Task.objects.filter(reporter=user)
    reported_bugs_qs = Bug.objects.filter(reporter=user)
    if scope_ids:
        reported_tasks_qs = reported_tasks_qs.filter(project_id__in=scope_ids)
        reported_bugs_qs = reported_bugs_qs.filter(project_id__in=scope_ids)
    elif filtered_subset:
        reported_tasks_qs = reported_tasks_qs.none()
        reported_bugs_qs = reported_bugs_qs.none()

    if start and end:
        reported_tasks_qs = reported_tasks_qs.filter(
            created_at__date__gte=start, created_at__date__lte=end
        )
        reported_bugs_qs = reported_bugs_qs.filter(
            created_at__date__gte=start, created_at__date__lte=end
        )

    all_memberships = (
        ProjectMember.objects.filter(user=user)
        .select_related("project")
        .order_by("project__name")
    )
    filter_memberships = all_memberships
    if viewer and viewer.pk != user.pk and not can_view_org_wide_users(viewer):
        filter_memberships = all_memberships.filter(
            project_id__in=managed_project_ids(viewer)
        )
    available_projects = [
        {
            "id": membership.project_id,
            "name": membership.project.name,
            "code": membership.project.code,
            "status": membership.project.status,
            "role": membership.role,
            "joined_at": membership.joined_at,
        }
        for membership in filter_memberships
    ]

    memberships = filter_memberships
    if scope_ids:
        memberships = memberships.filter(project_id__in=scope_ids)

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
        tasks_in_period.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )
    recent_bugs = (
        bugs_in_period.select_related("project")
        .prefetch_related("assignees")
        .order_by("-updated_at")[:10]
    )

    completed_tasks = assigned_tasks.filter(status="done")
    completed_bugs = assigned_bugs.filter(status__in=BUG_CLOSED_STATUSES)
    if start and end:
        completed_tasks = completed_tasks.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )
        completed_bugs = completed_bugs.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )

    breakdown_ids = scope_ids if scope_ids else _user_member_project_ids(user)
    project_breakdown = build_project_breakdown(user, breakdown_ids, start, end)

    return {
        "period": normalized,
        "period_label": period_label,
        "period_start": start.isoformat() if start else None,
        "period_end": end.isoformat() if end else None,
        "report_reference": anchor.isoformat(),
        "selected_project_ids": project_ids or [],
        "filtered_projects": filtered_subset,
        "stats": {
            "total_hours": round(total_minutes / 60, 1),
            "task_hours": round(task_time / 60, 1),
            "bug_hours": round(bug_time / 60, 1),
            "assigned_tasks": tasks_in_period.count() if start else assigned_tasks.count(),
            "open_tasks": assigned_tasks.exclude(
                status__in=TASK_CLOSED_STATUSES
            ).count(),
            "overdue_tasks": assigned_tasks.filter(
                due_date__isnull=False,
                due_date__lt=today,
            )
            .exclude(status__in=TASK_CLOSED_STATUSES)
            .count(),
            "completed_tasks": completed_tasks.count(),
            "assigned_bugs": bugs_in_period.count() if start else assigned_bugs.count(),
            "open_bugs": assigned_bugs.exclude(
                status__in=BUG_CLOSED_STATUSES
            ).count(),
            "completed_bugs": completed_bugs.count(),
            "reported_tasks": reported_tasks_qs.count(),
            "reported_bugs": reported_bugs_qs.count(),
            "projects_count": len(projects),
        },
        "projects": projects,
        "available_projects": available_projects,
        "project_breakdown": project_breakdown,
        "recent_tasks": TaskListSerializer(
            recent_tasks, many=True, context=context
        ).data,
        "recent_bugs": BugListSerializer(
            recent_bugs, many=True, context=context
        ).data,
    }
