from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.accounts.user_summary import build_user_summary


def build_user_report(user: User, request) -> dict:
    summary = build_user_summary(user, request)
    profile = UserSerializer(user, context={"request": request}).data
    stats = summary["stats"]
    display_name = user.get_full_name() or user.username
    generated = timezone.now()

    stat_cards = [
        {"label": "Total hours", "value": f"{stats['total_hours']}h", "tone": "default"},
        {"label": "Open tasks", "value": stats["open_tasks"], "tone": "task"},
        {"label": "Overdue tasks", "value": stats["overdue_tasks"], "tone": "danger"},
        {"label": "Open bugs", "value": stats["open_bugs"], "tone": "bug"},
        {"label": "Completed tasks", "value": stats["completed_tasks"], "tone": "success"},
        {"label": "Completed bugs", "value": stats["completed_bugs"], "tone": "success"},
        {"label": "Projects", "value": stats["projects_count"], "tone": "default"},
        {"label": "Assigned tasks", "value": stats["assigned_tasks"], "tone": "task"},
    ]

    profile_rows = [
        ("Name", display_name),
        ("Username", user.username),
        ("Email", user.email),
        ("Role", user.access_role.name if user.access_role_id else "—"),
        ("Department", profile.get("department_name") or "None"),
        ("Job title", user.job_title or "—"),
        ("Status", "Active" if user.is_active else "Inactive"),
    ]

    sections = []

    if summary["projects"]:
        sections.append({
            "title": "Projects",
            "headers": ["Project", "Code", "Status"],
            "rows": [
                [p["name"], p["code"], p["status"].replace("_", " ")]
                for p in summary["projects"]
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

    sections.append({
        "title": "Work breakdown",
        "bullets": [
            f"Task hours logged: {stats['task_hours']}h",
            f"Bug hours logged: {stats['bug_hours']}h",
            f"Tasks reported: {stats['reported_tasks']}",
            f"Bugs reported: {stats['reported_bugs']}",
            f"Assigned bugs (total): {stats['assigned_bugs']}",
        ],
    })

    return {
        "title": f"User Report — {display_name}",
        "generated_at": generated.isoformat(),
        "report_type": "user",
        "stat_cards": stat_cards,
        "profile_rows": [{"label": k, "value": v} for k, v in profile_rows],
        "sections": sections,
        "summary": summary,
    }


def build_user_report_pdf(user: User, request) -> bytes:
    from apps.core.pdf_reports import render_report_pdf

    data = build_user_report(user, request)
    profile_tuples = [(r["label"], r["value"]) for r in data["profile_rows"]]
    subtitle = f"Performance report · Generated {data['generated_at'][:19].replace('T', ' ')} UTC"

    return render_report_pdf(
        title=data["title"],
        subtitle=subtitle,
        accent_hex="#2563eb",
        stat_cards=data["stat_cards"],
        profile_rows=profile_tuples,
        sections=data["sections"],
    )
