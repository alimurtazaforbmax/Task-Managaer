from rest_framework.permissions import BasePermission

from apps.projects.models import ProjectMember


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        project = getattr(obj, "project", obj)
        return ProjectMember.objects.filter(
            project=project, user=request.user
        ).exists()
