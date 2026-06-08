from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.projects.views import ProjectMemberViewSet, ProjectViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("project-members", ProjectMemberViewSet, basename="project-member")

urlpatterns = [path("", include(router.urls))]
