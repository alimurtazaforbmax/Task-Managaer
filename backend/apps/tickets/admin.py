from django.contrib import admin

from apps.tickets.models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "request_type",
        "status",
        "project",
        "raised_by",
        "updated_at",
    )
    list_filter = ("status", "request_type", "project")
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at", "approved_at")
