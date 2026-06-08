from django.contrib import admin

from apps.tasks.models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "reporter", "due_date")
    filter_horizontal = ("assignees",)
    list_filter = ("status", "priority", "project")
    search_fields = ("title",)
