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
        from django.utils import timezone

        from apps.bugs.constants import BUG_CLOSED_STATUSES
        from apps.bugs.models import Bug
        from apps.core.mixins import user_project_ids
        from apps.tasks.models import Task

        user = request.user
        project_ids = list(user_project_ids(user))
        today = timezone.now().date()

        my_tasks = Task.objects.filter(
            project_id__in=project_ids, assignees=user
        ).exclude(status__in=["done", "cancelled"]).count()
        my_bugs = Bug.objects.filter(
            project_id__in=project_ids, assignees=user
        ).exclude(status__in=BUG_CLOSED_STATUSES).count()
        open_bugs = Bug.objects.filter(
            project_id__in=project_ids, status="open"
        ).count()
        overdue_tasks = (
            Task.objects.filter(
                project_id__in=project_ids,
                assignees=user,
                due_date__isnull=False,
                due_date__lt=today,
            )
            .exclude(status__in=["done", "cancelled"])
            .count()
        )

        return success_response(
            data={
                "my_open_tasks": my_tasks,
                "my_open_bugs": my_bugs,
                "project_open_bugs": open_bugs,
                "overdue_tasks": overdue_tasks,
            }
        )
