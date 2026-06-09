from django.db.models import Count
from django.utils import timezone

from apps.bugs.constants import BUG_CLOSED_STATUSES
from apps.bugs.models import Bug
from apps.projects.models import Project
from apps.projects.serializers import ProjectDetailSerializer
from apps.tasks.models import Task

TASK_CLOSED_STATUSES = ("done", "cancelled")


def build_project_report(project: Project, request) -> dict:
    context = {"request": request}
    detail = ProjectDetailSerializer(project, context=context).data
    generated = timezone.now()

    tasks = Task.objects.filter(project=project)
    bugs = Bug.objects.filter(project=project)
    task_total = tasks.count()
    bug_total = bugs.count()
    tasks_done = tasks.filter(status="done").count()
    bugs_closed = bugs.filter(status__in=BUG_CLOSED_STATUSES).count()
    open_tasks = tasks.exclude(status__in=TASK_CLOSED_STATUSES).count()
    open_bugs = bugs.exclude(status__in=BUG_CLOSED_STATUSES).count()

    task_by_status = dict(
        tasks.values("status").annotate(c=Count("id")).values_list("status", "c")
    )
    bug_by_status = dict(
        bugs.values("status").annotate(c=Count("id")).values_list("status", "c")
    )

    task_progress = round((tasks_done / task_total) * 100, 1) if task_total else 0
    bug_resolution = round((bugs_closed / bug_total) * 100, 1) if bug_total else 0

    stat_cards = [
        {"label": "Task completion", "value": f"{task_progress}%", "tone": "task"},
        {"label": "Bug resolution", "value": f"{bug_resolution}%", "tone": "bug"},
        {"label": "Open tasks", "value": open_tasks, "tone": "task"},
        {"label": "Open bugs", "value": open_bugs, "tone": "bug"},
        {"label": "Tasks done", "value": f"{tasks_done}/{task_total}", "tone": "success"},
        {"label": "Bugs closed", "value": f"{bugs_closed}/{bug_total}", "tone": "success"},
        {
            "label": "Team members",
            "value": detail.get("member_count", len(detail.get("members", []))),
            "tone": "default",
        },
    ]

    profile_rows = [
        ("Project", project.name),
        ("Code", project.code),
        ("Status", project.status.replace("_", " ")),
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

    members = detail.get("members") or []
    if members:
        sections.append({
            "title": "Team",
            "headers": ["Member", "Role"],
            "rows": [
                [
                    (m.get("user_detail") or {}).get("first_name")
                    or (m.get("user_detail") or {}).get("username")
                    or "User",
                    (m.get("role") or "").replace("_", " "),
                ]
                for m in members
            ],
        })

    recent_tasks = tasks.order_by("-updated_at")[:8]
    if recent_tasks.exists():
        sections.append({
            "title": "Recent tasks",
            "headers": ["Status", "Title"],
            "rows": [[t.status.replace("_", " "), t.title] for t in recent_tasks],
        })

    recent_bugs = bugs.order_by("-updated_at")[:8]
    if recent_bugs.exists():
        sections.append({
            "title": "Recent bugs",
            "headers": ["Status", "Title"],
            "rows": [[b.status.replace("_", " "), b.title] for b in recent_bugs],
        })

    return {
        "title": f"Project Report — {project.name}",
        "generated_at": generated.isoformat(),
        "report_type": "project",
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
            "task_by_status": task_by_status,
            "bug_by_status": bug_by_status,
        },
        "project": detail,
    }


def build_project_report_pdf(project: Project, request) -> bytes:
    from apps.core.pdf_reports import render_report_pdf

    data = build_project_report(project, request)
    profile_tuples = [(r["label"], r["value"]) for r in data["profile_rows"]]
    subtitle = f"Progress report · Generated {data['generated_at'][:19].replace('T', ' ')} UTC"

    return render_report_pdf(
        title=data["title"],
        subtitle=subtitle,
        accent_hex="#7c3aed",
        stat_cards=data["stat_cards"],
        profile_rows=profile_tuples,
        sections=data["sections"],
    )
