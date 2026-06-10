import json
import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from apps.core.models import ActivityLog, AuditLog, Notification, PushSubscription

logger = logging.getLogger(__name__)


def log_activity(*, actor, action: str, detail: str = "", task=None, bug=None):
    ActivityLog.objects.create(
        actor=actor,
        action=action,
        detail=detail,
        task=task,
        bug=bug,
    )


def record_audit_log(
    *,
    actor,
    action: str,
    entity_type: str,
    entity_id: int,
    entity_label: str = "",
    detail: str = "",
    changes: dict | None = None,
) -> None:
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        detail=detail,
        changes=changes or {},
    )


def send_push_to_user(
    *, user, title: str, message: str, link: str = "", notification_id: int | None = None
) -> None:
    if not settings.VAPID_PRIVATE_KEY:
        return

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush is not installed; skipping push notification.")
        return

    payload = json.dumps(
        {
            "title": title,
            "message": message,
            "link": link,
            "notification_id": notification_id,
        }
    )
    subscriptions = PushSubscription.objects.filter(user=user)

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth,
                    },
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_ADMIN_EMAIL},
            )
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in (404, 410):
                subscription.delete()
            else:
                logger.warning(
                    "Push failed for user %s: %s",
                    user.pk,
                    exc,
                )
        except Exception as exc:
            logger.warning("Push failed for user %s: %s", user.pk, exc)


def notify_user(*, user, title: str, message: str, link: str = ""):
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        link=link,
    )
    send_push_to_user(
        user=user,
        title=title,
        message=message,
        link=link,
        notification_id=notification.id,
    )


def work_item_stakeholder_ids(
    obj, actor, *, include_prior_commenters: bool = False
) -> set[int]:
    """Reporter and assignees; optionally prior commenters — never the whole project."""
    recipient_ids: set[int] = set()
    if getattr(obj, "reporter_id", None) and obj.reporter_id != actor.id:
        recipient_ids.add(obj.reporter_id)
    for user_id in obj.assignees.values_list("id", flat=True):
        if user_id != actor.id:
            recipient_ids.add(user_id)
    if include_prior_commenters:
        for user_id in (
            obj.comments.exclude(author_id=actor.id)
            .values_list("author_id", flat=True)
            .distinct()
        ):
            if user_id:
                recipient_ids.add(user_id)
    return recipient_ids


def notify_work_item_comment(*, obj, actor, comment_text: str) -> None:
    from apps.tasks.models import Task

    User = get_user_model()
    is_task = isinstance(obj, Task)
    label = "Task" if is_task else "Bug"
    link = f"/tasks/{obj.id}" if is_task else f"/bugs/{obj.id}"
    actor_name = actor.get_full_name() or actor.username
    preview = comment_text.strip()
    if len(preview) > 120:
        preview = f"{preview[:117]}..."
    message = (
        f'{actor_name} commented on {label.lower()} "{obj.title}": {preview}'
    )

    for user_id in work_item_stakeholder_ids(obj, actor, include_prior_commenters=True):
        try:
            notify_user(
                user=User.objects.get(pk=user_id),
                title=f"New comment on {label.lower()}",
                message=message,
                link=link,
            )
        except User.DoesNotExist:
            continue


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

    for user_id in work_item_stakeholder_ids(obj, actor):
        try:
            notify_user(
                user=User.objects.get(pk=user_id),
                title=f"{label} status updated",
                message=message,
                link=link,
            )
        except User.DoesNotExist:
            continue
