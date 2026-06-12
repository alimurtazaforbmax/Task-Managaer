from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.projects.planning_views import FeatureViewSet, SprintViewSet
from apps.projects.test_case_views import TestCaseViewSet
from apps.projects.views import ProjectMemberViewSet, ProjectViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("features", FeatureViewSet, basename="feature")
router.register("sprints", SprintViewSet, basename="sprint")
router.register("test-cases", TestCaseViewSet, basename="test-case")
router.register("project-members", ProjectMemberViewSet, basename="project-member")

urlpatterns = [path("", include(router.urls))]
