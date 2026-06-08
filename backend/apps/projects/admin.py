from django.contrib import admin

from apps.projects.models import Project, ProjectDocument, ProjectMember


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
