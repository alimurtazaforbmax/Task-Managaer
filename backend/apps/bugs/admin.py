from django.contrib import admin

from apps.bugs.models import Bug


@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "severity", "assignee", "reporter")
    list_filter = ("status", "severity", "project")
    search_fields = ("title",)
