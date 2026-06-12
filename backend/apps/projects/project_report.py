from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.core.models import TimeEntry
from apps.core.report_periods import normalize_report_period, resolve_report_period
from apps.projects.models import Project, ProjectMember
from apps.projects.serializers import ProjectSerializer
from apps.tasks.models import Task

TASK_CLOSED_STATUSES = ("done", "cancelled")


def _period_filter(field_prefix: str, start, end) -> Q:
    if start is None or end is None:
        return Q()
    return Q(**{f"{field_prefix}__gte": start, f"{field_prefix}__lte": end})


def build_project_report(
    project: Project, request, period: str | None = None, reference=None
) -> dict:
    normalized_period = normalize_report_period(period)
    start, end, period_label = resolve_report_period(normalized_period, reference)
    context = {"request": request}
    detail = ProjectSerializer(project, context=context).data
    generated = timezone.now()

    tasks = Task.objects.filter(project=project)
    bugs = Bug.objects.filter(project=project)

    period_tasks = tasks.filter(_period_filter("created_at__date", start, end))
    period_bugs = bugs.filter(_period_filter("created_at__date", start, end))
    tasks_done_period = tasks.filter(
        status="done",
    ).filter(_period_filter("updated_at__date", start, end))
    bugs_closed_period = bugs.filter(status__in=BUG_CLOSED_STATUSES).filter(
        _period_filter("updated_at__date", start, end)
    )

    task_total = period_tasks.count() if start else tasks.count()
    bug_total = period_bugs.count() if start else bugs.count()
    tasks_done = tasks_done_period.count()
    bugs_closed = bugs_closed_period.count()
    open_tasks = tasks.exclude(status__in=TASK_CLOSED_STATUSES).count()
    open_bugs = bugs.exclude(status__in=BUG_CLOSED_STATUSES).count()

    time_qs = TimeEntry.objects.filter(
        Q(task__project=project) | Q(bug__project=project)
    )
    if start and end:
        time_qs = time_qs.filter(work_date__gte=start, work_date__lte=end)
    period_minutes = time_qs.aggregate(total=Sum("minutes"))["total"] or 0
    period_hours = round(period_minutes / 60, 1)

    task_by_status = dict(
        (period_tasks if start else tasks)
        .values("status")
        .annotate(c=Count("id"))
        .values_list("status", "c")
    )
    bug_by_status = dict(
        (period_bugs if start else bugs)
        .values("status")
        .annotate(c=Count("id"))
        .values_list("status", "c")
    )

    task_progress = round((tasks_done / task_total) * 100, 1) if task_total else 0
    bug_resolution = round((bugs_closed / bug_total) * 100, 1) if bug_total else 0

    range_label = (
        f"{start.isoformat()} to {end.isoformat()}" if start and end else "All time"
    )

    stat_cards = [
        {"label": "Hours logged", "value": f"{period_hours}h", "tone": "default"},
        {"label": "Task completion", "value": f"{task_progress}%", "tone": "task"},
        {"label": "Bug resolution", "value": f"{bug_resolution}%", "tone": "bug"},
        {"label": "Open tasks", "value": open_tasks, "tone": "task"},
        {"label": "Open bugs", "value": open_bugs, "tone": "bug"},
        {"label": "Tasks done", "value": f"{tasks_done}/{task_total}", "tone": "success"},
        {"label": "Bugs closed", "value": f"{bugs_closed}/{bug_total}", "tone": "success"},
        {
            "label": "Team members",
            "value": detail.get("member_count", 0),
            "tone": "default",
        },
    ]

    profile_rows = [
        ("Project", project.name),
        ("Code", project.code),
        ("Status", project.status.replace("_", " ")),
        ("Report period", period_label),
        ("Date range", range_label),
        ("Start date", str(project.start_date) if project.start_date else "—"),
        ("End date", str(project.end_date) if project.end_date else "—"),
        ("Description", project.description or "—"),
    ]

    sections = []

    if task_by_status:
        sections.append({
            "title": "Tasks by status",
            "headers": ["Status", "Count"],
            "rows": [
                [s.replace("_", " "), str(c)]
                for s, c in sorted(task_by_status.items())
            ],
        })

    if bug_by_status:
        sections.append({
            "title": "Bugs by status",
            "headers": ["Status", "Count"],
            "rows": [
                [s.replace("_", " "), str(c)]
                for s, c in sorted(bug_by_status.items())
            ],
        })

    members = (
        ProjectMember.objects.filter(project=project)
        .select_related("user")
        .order_by("joined_at")[:20]
    )
    if members.exists():
        sections.append({
            "title": "Team (sample)",
            "headers": ["Member", "Role"],
            "rows": [
                [
                    m.user.get_full_name() or m.user.username,
                    (m.role or "").replace("_", " "),
                ]
                for m in members
            ],
        })

    recent_tasks = (
        (period_tasks if start else tasks).order_by("-updated_at")[:8]
    )
    if recent_tasks.exists():
        sections.append({
            "title": "Recent tasks",
            "headers": ["Status", "Title"],
            "rows": [[t.status.replace("_", " "), t.title] for t in recent_tasks],
        })

    recent_bugs = (
        (period_bugs if start else bugs).order_by("-updated_at")[:8]
    )
    if recent_bugs.exists():
        sections.append({
            "title": "Recent bugs",
            "headers": ["Status", "Title"],
            "rows": [[b.status.replace("_", " "), b.title] for b in recent_bugs],
        })

    sections.append({
        "title": "Period activity",
        "bullets": [
            f"Tasks created: {period_tasks.count() if start else task_total}",
            f"Tasks completed: {tasks_done}",
            f"Bugs reported: {period_bugs.count() if start else bug_total}",
            f"Bugs closed: {bugs_closed}",
            f"Hours logged: {period_hours}h",
        ],
    })

    return {
        "title": f"Project Report — {project.name} ({period_label})",
        "generated_at": generated.isoformat(),
        "report_type": "project",
        "period": normalized_period,
        "period_label": period_label,
        "period_start": start.isoformat() if start else None,
        "period_end": end.isoformat() if end else None,
        "stat_cards": stat_cards,
        "profile_rows": [{"label": k, "value": v} for k, v in profile_rows],
        "sections": sections,
        "progress": {
            "task_completion_percent": task_progress,
            "bug_resolution_percent": bug_resolution,
            "open_tasks": open_tasks,
            "open_bugs": open_bugs,
            "total_tasks": task_total,
            "total_bugs": bug_total,
            "tasks_done": tasks_done,
            "bugs_closed": bugs_closed,
            "hours_logged": period_hours,
            "task_by_status": task_by_status,
            "bug_by_status": bug_by_status,
        },
        "project": detail,
    }


def build_project_report_pdf(
    project: Project, request, period: str | None = None, reference=None
) -> bytes:
    from apps.core.pdf_reports import render_report_pdf

    data = build_project_report(project, request, period=period, reference=reference)
    profile_tuples = [(r["label"], r["value"]) for r in data["profile_rows"]]
    subtitle = (
        f"{data['period_label']} progress report · "
        f"Generated {data['generated_at'][:19].replace('T', ' ')} UTC"
    )

    return render_report_pdf(
        title=data["title"],
        subtitle=subtitle,
        accent_hex="#7c3aed",
        stat_cards=data["stat_cards"],
        profile_rows=profile_tuples,
        sections=data["sections"],
    )
