from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.bugs.models import Bug
from apps.core.mixins import StandardResponseMixin, member_project_ids
from apps.core.permissions import can_approve_ticket, can_edit_ticket
from apps.core.responses import error_response, success_response
from apps.core.services import log_activity, record_audit_log
from apps.tasks.models import Task
from apps.tickets.models import Ticket, TicketRequestType, TicketStatus
from apps.tickets.serializers import (
    TicketListSerializer,
    TicketRejectSerializer,
    TicketSerializer,
    TicketUpdateSerializer,
)


class TicketViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description"]
    filterset_fields = ["status", "request_type", "project", "raised_by"]
    ordering_fields = ["updated_at", "created_at"]
    create_message = "Ticket created."
    update_message = "Ticket updated."
    delete_message = "Ticket deleted."

    def get_queryset(self):
        qs = Ticket.objects.select_related(
            "project",
            "raised_by",
            "mentioned_user",
            "mentioned_department",
            "last_edited_by",
            "approved_by",
        )
        return qs.filter(project_id__in=member_project_ids(self.request.user))

    def get_serializer_class(self):
        if self.action == "list":
            return TicketListSerializer
        if self.action in ("update", "partial_update"):
            return TicketUpdateSerializer
        return TicketSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        ticket = serializer.save(raised_by=self.request.user)
        record_audit_log(
            actor=self.request.user,
            action="created",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
            detail=f"Ticket raised ({ticket.get_request_type_display()})",
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        ticket = Ticket.objects.select_related(
            "project",
            "raised_by",
            "mentioned_user",
            "mentioned_department",
        ).get(pk=serializer.instance.pk)
        return success_response(
            data=TicketSerializer(ticket, context={"request": request}).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        ticket = self.get_object()
        if ticket.status != TicketStatus.PENDING:
            return error_response(
                "Only pending tickets can be edited.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not can_edit_ticket(request.user, ticket):
            return error_response(
                "Only the ticket creator or a project manager can edit this ticket.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(ticket, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(last_edited_by=request.user)
        ticket.refresh_from_db()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
            detail="Ticket details updated",
        )
        return success_response(
            data=TicketSerializer(ticket, context={"request": request}).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        ticket = self.get_object()
        if ticket.status != TicketStatus.PENDING:
            return error_response(
                "Only pending tickets can be deleted.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not can_edit_ticket(request.user, ticket):
            return error_response(
                "You do not have permission to delete this ticket.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        ticket = self.get_object()
        if not can_approve_ticket(request.user, ticket):
            return error_response(
                "Only admins and project managers can approve tickets.",
                status=status.HTTP_403_FORBIDDEN,
            )
        if ticket.status != TicketStatus.PENDING:
            return error_response(
                "This ticket has already been reviewed.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            created_task = None
            created_bug = None

            if ticket.request_type == TicketRequestType.TASK:
                created_task = Task.objects.create(
                    project=ticket.project,
                    title=ticket.title,
                    description=ticket.description,
                    reporter=ticket.raised_by,
                    assignee_department=ticket.mentioned_department,
                )
                if ticket.mentioned_user_id:
                    created_task.assignees.add(ticket.mentioned_user)
                log_activity(
                    actor=request.user,
                    action="task_created",
                    detail=f"From ticket #{ticket.id}: {ticket.title}",
                    task=created_task,
                )
                record_audit_log(
                    actor=request.user,
                    action="created",
                    entity_type="task",
                    entity_id=created_task.id,
                    entity_label=created_task.title,
                    detail=f"Created from ticket #{ticket.id}",
                )

            elif ticket.request_type == TicketRequestType.BUG:
                created_bug = Bug.objects.create(
                    project=ticket.project,
                    title=ticket.title,
                    description=ticket.description,
                    reporter=ticket.raised_by,
                    assignee_department=ticket.mentioned_department,
                )
                if ticket.mentioned_user_id:
                    created_bug.assignees.add(ticket.mentioned_user)
                log_activity(
                    actor=request.user,
                    action="bug_created",
                    detail=f"From ticket #{ticket.id}: {ticket.title}",
                    bug=created_bug,
                )
                record_audit_log(
                    actor=request.user,
                    action="created",
                    entity_type="bug",
                    entity_id=created_bug.id,
                    entity_label=created_bug.title,
                    detail=f"Created from ticket #{ticket.id}",
                )

            ticket.status = TicketStatus.APPROVED
            ticket.approved_by = request.user
            ticket.approved_at = timezone.now()
            ticket.last_edited_by = request.user
            ticket.created_task = created_task
            ticket.created_bug = created_bug
            ticket.save(
                update_fields=[
                    "status",
                    "approved_by",
                    "approved_at",
                    "last_edited_by",
                    "created_task",
                    "created_bug",
                    "updated_at",
                ]
            )

        record_audit_log(
            actor=request.user,
            action="approved",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
            detail=ticket.get_request_type_display(),
        )

        ticket.refresh_from_db()
        return success_response(
            data=TicketSerializer(ticket, context={"request": request}).data,
            message="Ticket approved.",
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        ticket = self.get_object()
        if not can_approve_ticket(request.user, ticket):
            return error_response(
                "Only admins and project managers can reject tickets.",
                status=status.HTTP_403_FORBIDDEN,
            )
        if ticket.status != TicketStatus.PENDING:
            return error_response(
                "This ticket has already been reviewed.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TicketRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("rejection_reason", "")

        ticket.status = TicketStatus.REJECTED
        ticket.approved_by = request.user
        ticket.approved_at = timezone.now()
        ticket.last_edited_by = request.user
        ticket.rejection_reason = reason
        ticket.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "last_edited_by",
                "rejection_reason",
                "updated_at",
            ]
        )

        record_audit_log(
            actor=request.user,
            action="rejected",
            entity_type="ticket",
            entity_id=ticket.id,
            entity_label=ticket.title,
            detail=reason or "Ticket rejected",
        )

        return success_response(
            data=TicketSerializer(ticket, context={"request": request}).data,
            message="Ticket rejected.",
        )
