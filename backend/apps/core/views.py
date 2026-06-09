from django.conf import settings
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.core.models import AuditLog, Notification, PushSubscription
from apps.core.permissions import IsAdmin
from apps.core.responses import error_response, success_response
from apps.core.serializers import (
    AuditLogSerializer,
    NotificationSerializer,
    PushSubscribeSerializer,
    PushUnsubscribeSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(data=serializer.data)

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return success_response(
            data=NotificationSerializer(notification).data,
            message="Notification marked as read.",
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return success_response(data={"count": count})

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return success_response(
            data={"updated": updated},
            message="All notifications marked as read.",
        )

    @action(detail=False, methods=["get"], url_path="push/vapid-key")
    def push_vapid_key(self, request):
        if not settings.VAPID_PUBLIC_KEY:
            return error_response(
                "Push notifications are not configured.",
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return success_response(data={"public_key": settings.VAPID_PUBLIC_KEY})

    @action(detail=False, methods=["post"], url_path="push/subscribe")
    def push_subscribe(self, request):
        serializer = PushSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.validated_data["endpoint"]
        keys = serializer.validated_data["keys"]

        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": keys["p256dh"],
                "auth": keys["auth"],
            },
        )
        return success_response(message="Push subscription saved.")

    @action(detail=False, methods=["post"], url_path="push/unsubscribe")
    def push_unsubscribe(self, request):
        serializer = PushUnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deleted, _ = PushSubscription.objects.filter(
            user=request.user,
            endpoint=serializer.validated_data["endpoint"],
        ).delete()
        if deleted:
            return success_response(message="Push subscription removed.")
        return success_response(message="No push subscription found.")


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    search_fields = ["entity_label", "detail", "action", "entity_type"]
    filterset_fields = ["action", "entity_type", "actor"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return AuditLog.objects.select_related("actor")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(data=serializer.data)


class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta

        from django.utils import timezone

        from apps.accounts.permissions_util import user_has_permission
        from apps.bugs.constants import BUG_CLOSED_STATUSES
        from apps.bugs.models import Bug
        from apps.bugs.serializers import BugListSerializer
        from apps.core.mixins import user_project_ids
        from apps.core.models import Notification
        from apps.projects.models import Feature, Sprint
        from apps.tasks.models import Task
        from apps.tasks.serializers import TaskListSerializer
        from apps.tickets.models import Ticket

        user = request.user
        project_ids = list(user_project_ids(user))
        today = timezone.now().date()
        week_end = today + timedelta(days=7)
        context = {"request": request}

        my_task_qs = Task.objects.filter(
            project_id__in=project_ids, assignees=user
        ).exclude(status__in=["done", "cancelled"])
        my_bug_qs = Bug.objects.filter(
            project_id__in=project_ids, assignees=user
        ).exclude(status__in=BUG_CLOSED_STATUSES)

        my_tasks = my_task_qs.count()
        my_bugs = my_bug_qs.count()
        open_bugs = Bug.objects.filter(
            project_id__in=project_ids, status="open"
        ).count()
        overdue_tasks = my_task_qs.filter(
            due_date__isnull=False,
            due_date__lt=today,
        ).count()
        due_soon_tasks = my_task_qs.filter(
            due_date__isnull=False,
            due_date__gte=today,
            due_date__lte=week_end,
        ).count()

        active_features = Feature.objects.filter(
            project_id__in=project_ids,
            status__in=["planned", "in_progress"],
        ).count()
        my_owned_features = Feature.objects.filter(
            project_id__in=project_ids,
            owner=user,
        ).exclude(status__in=["done", "cancelled"]).count()
        active_sprints = Sprint.objects.filter(
            project_id__in=project_ids,
            status="active",
        ).count()

        unread_notifications = Notification.objects.filter(
            user=user, is_read=False
        ).count()

        pending_tickets = 0
        if user_has_permission(user, "can_approve_tickets"):
            pending_tickets = Ticket.objects.filter(
                project_id__in=project_ids,
                status="pending",
            ).count()

        upcoming_tasks = (
            my_task_qs.filter(due_date__isnull=False, due_date__gte=today)
            .select_related("project")
            .order_by("due_date")[:5]
        )
        recent_tasks = (
            my_task_qs.select_related("project")
            .order_by("-updated_at")[:5]
        )
        active_sprint_list = (
            Sprint.objects.filter(project_id__in=project_ids, status="active")
            .select_related("project")
            .order_by("end_date")[:5]
        )
        my_features = (
            Feature.objects.filter(project_id__in=project_ids, owner=user)
            .exclude(status__in=["done", "cancelled"])
            .select_related("project")
            .order_by("target_date", "-updated_at")[:5]
        )

        display_name = (
            f"{user.first_name} {user.last_name}".strip() or user.username
        )

        return success_response(
            data={
                "greeting_name": display_name,
                "my_open_tasks": my_tasks,
                "my_open_bugs": my_bugs,
                "project_open_bugs": open_bugs,
                "overdue_tasks": overdue_tasks,
                "due_soon_tasks": due_soon_tasks,
                "my_projects_count": len(project_ids),
                "unread_notifications": unread_notifications,
                "pending_tickets": pending_tickets,
                "active_features": active_features,
                "my_owned_features": my_owned_features,
                "active_sprints": active_sprints,
                "can_approve_tickets": user_has_permission(
                    user, "can_approve_tickets"
                ),
                "upcoming_tasks": TaskListSerializer(
                    upcoming_tasks, many=True, context=context
                ).data,
                "recent_tasks": TaskListSerializer(
                    recent_tasks, many=True, context=context
                ).data,
                "active_sprints_list": [
                    {
                        "id": sprint.id,
                        "name": sprint.name,
                        "project_id": sprint.project_id,
                        "project_name": sprint.project.name,
                        "end_date": sprint.end_date,
                        "status": sprint.status,
                    }
                    for sprint in active_sprint_list
                ],
                "my_features": [
                    {
                        "id": feature.id,
                        "title": feature.title,
                        "project_id": feature.project_id,
                        "project_name": feature.project.name,
                        "status": feature.status,
                        "target_date": feature.target_date,
                    }
                    for feature in my_features
                ],
                "recent_bugs": BugListSerializer(
                    my_bug_qs.select_related("project")
                    .order_by("-updated_at")[:5],
                    many=True,
                    context=context,
                ).data,
            }
        )
