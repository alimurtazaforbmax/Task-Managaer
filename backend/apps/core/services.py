from apps.core.models import ActivityLog, Notification


def log_activity(*, actor, action: str, detail: str = "", task=None, bug=None):
    ActivityLog.objects.create(
        actor=actor,
        action=action,
        detail=detail,
        task=task,
        bug=bug,
    )


def notify_user(*, user, title: str, message: str, link: str = ""):
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        link=link,
    )
