from django.http import HttpRequest

from apps.core.report_periods import parse_report_reference


def parse_report_reference_param(request: HttpRequest):
    return parse_report_reference(request.query_params.get("reference"))


def parse_project_ids_param(request: HttpRequest) -> list[int] | None:
    raw = request.query_params.get("projects", "").strip()
    if not raw:
        return None
    ids: list[int] = []
    for token in raw.split(","):
        token = token.strip()
        if token.isdigit():
            ids.append(int(token))
    return list(dict.fromkeys(ids)) if ids else None
