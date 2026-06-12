import calendar
from datetime import date, timedelta

from django.utils import timezone

REPORT_PERIODS = frozenset({"daily", "weekly", "monthly", "yearly"})


def normalize_report_period(period: str | None) -> str:
    if period in REPORT_PERIODS:
        return period
    return "monthly"


def parse_report_reference(value: str | None) -> date | None:
    """Parse YYYY-MM-DD anchor date from query param."""
    if not value or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None


def _month_end(anchor: date) -> date:
    last_day = calendar.monthrange(anchor.year, anchor.month)[1]
    return anchor.replace(day=last_day)


def _format_short(d: date) -> str:
    return d.strftime("%b %d, %Y")


def resolve_report_period(
    period: str | None,
    reference: date | None = None,
) -> tuple[date | None, date | None, str]:
    """Return (start_date, end_date, label) for the requested period."""
    normalized = normalize_report_period(period)
    today = timezone.now().date()
    anchor = reference or today

    if normalized == "daily":
        return anchor, anchor, f"Daily — {_format_short(anchor)}"

    if normalized == "weekly":
        start = anchor - timedelta(days=anchor.weekday())
        end = start + timedelta(days=6)
        return start, end, f"Weekly — {_format_short(start)} – {_format_short(end)}"

    if normalized == "monthly":
        start = anchor.replace(day=1)
        end = _month_end(anchor)
        return start, end, f"Monthly — {anchor.strftime('%B %Y')}"

    if normalized == "yearly":
        start = date(anchor.year, 1, 1)
        end = date(anchor.year, 12, 31)
        return start, end, f"Yearly — {anchor.year}"

    return None, None, "All time"
