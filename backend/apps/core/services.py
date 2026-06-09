from django.contrib.auth import get_user_model

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


def notify_status_change(*, obj, actor, old_status: str, new_status: str) -> None:
    from apps.tasks.models import Task

    User = get_user_model()
    is_task = isinstance(obj, Task)
    label = "Task" if is_task else "Bug"
    link = f"/tasks/{obj.id}" if is_task else f"/bugs/{obj.id}"
    actor_name = actor.get_full_name() or actor.username
    message = (
        f'{label} "{obj.title}" status changed from '
        f"{old_status.replace('_', ' ')} to {new_status.replace('_', ' ')} "
        f"by {actor_name}."
    )

    recipient_ids = set()
    if obj.reporter_id and obj.reporter_id != actor.id:
        recipient_ids.add(obj.reporter_id)
    for user_id in obj.assignees.values_list("id", flat=True):
        if user_id != actor.id:
            recipient_ids.add(user_id)

    for user_id in recipient_ids:
        try:
            notify_user(
                user=User.objects.get(pk=user_id),
                title=f"{label} status updated",
                message=message,
                link=link,
            )
        except User.DoesNotExist:
            continue
