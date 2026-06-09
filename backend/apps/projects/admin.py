from django.contrib import admin

from apps.projects.models import Feature, Project, ProjectDocument, ProjectMember, Sprint


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "code")
    inlines = [ProjectMemberInline]


@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "uploaded_by", "created_at")


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "owner")
    list_filter = ("status", "priority", "project")


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "status", "start_date", "end_date")
    list_filter = ("status", "project")
