BUG_CLOSED_STATUSES = ("closed", "fixed", "rejected")


def is_bug_open(status: str) -> bool:
    return status not in BUG_CLOSED_STATUSES
