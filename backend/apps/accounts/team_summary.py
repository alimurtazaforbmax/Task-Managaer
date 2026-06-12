from django.db.models import Q, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.core.mixins import user_project_ids
from apps.core.models import TimeEntry
from apps.core.report_periods import normalize_report_period, resolve_report_period
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

TASK_CLOSED_STATUSES = ("done", "cancelled")


def _member_stats(user: User, project_ids: list[int], start, end) -> dict:
    if not project_ids:
        return {
            "hours_logged": 0,
            "task_hours": 0,
            "bug_hours": 0,
            "open_tasks": 0,
            "overdue_tasks": 0,
            "completed_tasks": 0,
            "open_bugs": 0,
            "completed_bugs": 0,
            "projects_count": 0,
        }

    today = timezone.now().date()
    assigned_tasks = Task.objects.filter(assignees=user, project_id__in=project_ids)
    assigned_bugs = Bug.objects.filter(assignees=user, project_id__in=project_ids)

    time_qs = TimeEntry.objects.filter(user=user).filter(
        Q(task__project_id__in=project_ids) | Q(bug__project_id__in=project_ids)
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

    completed_tasks = assigned_tasks.filter(status="done")
    completed_bugs = assigned_bugs.filter(status__in=BUG_CLOSED_STATUSES)
    if start and end:
        completed_tasks = completed_tasks.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )
        completed_bugs = completed_bugs.filter(
            updated_at__date__gte=start, updated_at__date__lte=end
        )

    member_project_count = (
        ProjectMember.objects.filter(user=user, project_id__in=project_ids)
        .values("project_id")
        .distinct()
        .count()
    )

    return {
        "hours_logged": round(total_minutes / 60, 1),
        "task_hours": round(task_minutes / 60, 1),
        "bug_hours": round(bug_minutes / 60, 1),
        "open_tasks": assigned_tasks.exclude(status__in=TASK_CLOSED_STATUSES).count(),
        "overdue_tasks": assigned_tasks.filter(
            due_date__isnull=False,
            due_date__lt=today,
        )
        .exclude(status__in=TASK_CLOSED_STATUSES)
        .count(),
        "completed_tasks": completed_tasks.count(),
        "open_bugs": assigned_bugs.exclude(status__in=BUG_CLOSED_STATUSES).count(),
        "completed_bugs": completed_bugs.count(),
        "projects_count": member_project_count,
    }


def _resolve_scope(actor: User, project_id: int | None) -> list[int]:
    actor_projects = list(user_project_ids(actor))
    if not project_id:
        return actor_projects
    if project_id not in actor_projects:
        return []
    return [project_id]


def build_team_summary(
    actor: User,
    request,
    project_id: int | None = None,
    period: str | None = None,
    reference=None,
    search: str | None = None,
) -> dict:
    context = {"request": request}
    normalized = normalize_report_period(period)
    start, end, period_label = resolve_report_period(normalized, reference)
    anchor = reference or timezone.now().date()

    actor_project_ids = list(user_project_ids(actor))
    scope_ids = _resolve_scope(actor, project_id)
    projects = list(
        Project.objects.filter(id__in=actor_project_ids).order_by("name").values(
            "id", "name", "code", "status"
        )
    )

    members_qs = (
        User.objects.filter(project_memberships__project_id__in=scope_ids)
        .distinct()
        .select_related("access_role", "department")
        .order_by("first_name", "last_name", "username")
    )

    if search:
        term = search.strip()
        members_qs = members_qs.filter(
            Q(username__icontains=term)
            | Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
            | Q(email__icontains=term)
        )

    memberships = ProjectMember.objects.filter(
        project_id__in=scope_ids
    ).select_related("project")
    roles_by_user: dict[int, list[dict]] = {}
    for membership in memberships:
        roles_by_user.setdefault(membership.user_id, []).append(
            {
                "project_id": membership.project_id,
                "project_name": membership.project.name,
                "project_code": membership.project.code,
                "role": membership.role,
            }
        )

    team_totals = {
        "hours_logged": 0.0,
        "task_hours": 0.0,
        "bug_hours": 0.0,
        "open_tasks": 0,
        "overdue_tasks": 0,
        "completed_tasks": 0,
        "open_bugs": 0,
        "completed_bugs": 0,
        "member_count": 0,
        "active_members": 0,
        "project_count": len(projects),
    }

    members_payload = []
    for member in members_qs:
        stats = _member_stats(member, scope_ids, start, end)
        members_payload.append(
            {
                "user": UserSerializer(member, context=context).data,
                "project_roles": roles_by_user.get(member.id, []),
                "stats": stats,
            }
        )
        team_totals["hours_logged"] = round(
            team_totals["hours_logged"] + stats["hours_logged"], 1
        )
        team_totals["task_hours"] = round(
            team_totals["task_hours"] + stats["task_hours"], 1
        )
        team_totals["bug_hours"] = round(
            team_totals["bug_hours"] + stats["bug_hours"], 1
        )
        team_totals["open_tasks"] += stats["open_tasks"]
        team_totals["overdue_tasks"] += stats["overdue_tasks"]
        team_totals["completed_tasks"] += stats["completed_tasks"]
        team_totals["open_bugs"] += stats["open_bugs"]
        team_totals["completed_bugs"] += stats["completed_bugs"]
        team_totals["member_count"] += 1
        if member.is_active:
            team_totals["active_members"] += 1

    return {
        "period": normalized,
        "period_label": period_label,
        "period_start": start.isoformat() if start else None,
        "period_end": end.isoformat() if end else None,
        "report_reference": anchor.isoformat(),
        "selected_project_id": project_id,
        "projects": projects,
        "stats": team_totals,
        "members": members_payload,
    }
