from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.core.models import Notification
from apps.core.responses import success_response
from apps.core.serializers import NotificationSerializer


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


class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        from apps.bugs.models import Bug
        from apps.core.mixins import user_project_ids
        from apps.tasks.models import Task

        user = request.user
        project_ids = list(user_project_ids(user))
        today = timezone.now().date()

        my_tasks = Task.objects.filter(
            project_id__in=project_ids, assignee=user
        ).exclude(status="done").count()
        my_bugs = Bug.objects.filter(
            project_id__in=project_ids, assignee=user
        ).exclude(status="closed").count()
        open_bugs = Bug.objects.filter(
            project_id__in=project_ids, status="open"
        ).count()
        overdue_tasks = Task.objects.filter(
            project_id__in=project_ids,
            due_date__lt=today,
        ).exclude(status__in=["done", "cancelled"]).count()

        return success_response(
            data={
                "my_open_tasks": my_tasks,
                "my_open_bugs": my_bugs,
                "project_open_bugs": open_bugs,
                "overdue_tasks": overdue_tasks,
            }
        )
