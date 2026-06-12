from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.accounts.user_summary import build_user_summary
from apps.core.report_periods import normalize_report_period, resolve_report_period


def build_user_report(
    user: User,
    request,
    period: str | None = None,
    project_ids: list[int] | None = None,
    reference=None,
) -> dict:
    normalized_period = normalize_report_period(period)
    start, end, period_label = resolve_report_period(normalized_period, reference)
    summary = build_user_summary(
        user,
        request,
        period=normalized_period,
        project_ids=project_ids,
        reference=reference,
    )
    profile = UserSerializer(user, context={"request": request}).data
    stats = summary["stats"]
    display_name = user.get_full_name() or user.username
    generated = timezone.now()

    range_label = (
        f"{start.isoformat()} to {end.isoformat()}" if start and end else "All time"
    )

    if summary.get("filtered_projects") and summary.get("selected_project_ids"):
        project_names = [p["name"] for p in summary["projects"]]
        projects_label = ", ".join(project_names) if project_names else "Selected projects"
    else:
        projects_label = "All projects"

    stat_cards = [
        {"label": "Hours logged", "value": f"{stats['total_hours']}h", "tone": "default"},
        {"label": "Task hours", "value": f"{stats['task_hours']}h", "tone": "task"},
        {"label": "Bug hours", "value": f"{stats['bug_hours']}h", "tone": "bug"},
        {"label": "Tasks completed", "value": stats["completed_tasks"], "tone": "success"},
        {"label": "Bugs closed", "value": stats["completed_bugs"], "tone": "success"},
        {"label": "Open tasks", "value": stats["open_tasks"], "tone": "task"},
        {"label": "Open bugs", "value": stats["open_bugs"], "tone": "bug"},
        {"label": "Projects", "value": stats["projects_count"], "tone": "default"},
    ]

    profile_rows = [
        ("Name", display_name),
        ("Username", user.username),
        ("Email", user.email),
        ("Role", user.access_role.name if user.access_role_id else "—"),
        ("Department", profile.get("department_name") or "None"),
        ("Job title", user.job_title or "—"),
        ("Status", "Active" if user.is_active else "Inactive"),
        ("Report period", period_label),
        ("Date range", range_label),
        ("Projects", projects_label),
    ]

    sections = []

    breakdown = summary.get("project_breakdown") or []
    if breakdown:
        sections.append({
            "title": "Work by project",
            "headers": [
                "Project",
                "Hours",
                "Task hrs",
                "Bug hrs",
                "Tasks done",
                "Bugs closed",
            ],
            "rows": [
                [
                    row["name"],
                    f"{row['hours_logged']}h",
                    f"{row['task_hours']}h",
                    f"{row['bug_hours']}h",
                    str(row["completed_tasks"]),
                    str(row["completed_bugs"]),
                ]
                for row in breakdown
            ],
        })
        sections.append({
            "title": "Total (selected scope)",
            "bullets": [
                f"Total hours logged: {stats['total_hours']}h",
                f"Task hours: {stats['task_hours']}h · Bug hours: {stats['bug_hours']}h",
                f"Tasks completed: {stats['completed_tasks']}",
                f"Bugs closed: {stats['completed_bugs']}",
                f"Tasks reported: {stats['reported_tasks']}",
                f"Bugs reported: {stats['reported_bugs']}",
            ],
        })

    if summary["recent_tasks"]:
        sections.append({
            "title": "Recent tasks",
            "headers": ["Status", "Title", "Project"],
            "rows": [
                [
                    t["status"].replace("_", " "),
                    t["title"],
                    t.get("project_name") or "",
                ]
                for t in summary["recent_tasks"]
            ],
        })

    if summary["recent_bugs"]:
        sections.append({
            "title": "Recent bugs",
            "headers": ["Status", "Title", "Project"],
            "rows": [
                [
                    b["status"].replace("_", " "),
                    b["title"],
                    b.get("project_name") or "",
                ]
                for b in summary["recent_bugs"]
            ],
        })

    if not breakdown:
        sections.append({
            "title": "Work breakdown",
            "bullets": [
                f"Task hours logged: {stats['task_hours']}h",
                f"Bug hours logged: {stats['bug_hours']}h",
                f"Tasks reported: {stats['reported_tasks']}",
                f"Bugs reported: {stats['reported_bugs']}",
                f"Tasks completed in period: {stats['completed_tasks']}",
                f"Bugs closed in period: {stats['completed_bugs']}",
            ],
        })

    return {
        "title": f"User Report — {display_name} ({period_label})",
        "generated_at": generated.isoformat(),
        "report_type": "user",
        "period": normalized_period,
        "period_label": period_label,
        "period_start": start.isoformat() if start else None,
        "period_end": end.isoformat() if end else None,
        "selected_project_ids": summary.get("selected_project_ids", []),
        "stat_cards": stat_cards,
        "profile_rows": [{"label": k, "value": v} for k, v in profile_rows],
        "sections": sections,
        "summary": summary,
    }


def build_user_report_pdf(
    user: User,
    request,
    period: str | None = None,
    project_ids: list[int] | None = None,
    reference=None,
) -> bytes:
    from apps.core.pdf_reports import render_report_pdf

    data = build_user_report(
        user,
        request,
        period=period,
        project_ids=project_ids,
        reference=reference,
    )
    profile_tuples = [(r["label"], r["value"]) for r in data["profile_rows"]]
    subtitle = (
        f"{data['period_label']} progress report · "
        f"Generated {data['generated_at'][:19].replace('T', ' ')} UTC"
    )

    return render_report_pdf(
        title=data["title"],
        subtitle=subtitle,
        accent_hex="#2563eb",
        stat_cards=data["stat_cards"],
        profile_rows=profile_tuples,
        sections=data["sections"],
    )
