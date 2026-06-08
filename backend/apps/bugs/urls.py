from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.bugs.views import BugViewSet

router = DefaultRouter()
router.register("bugs", BugViewSet, basename="bug")

urlpatterns = [path("", include(router.urls))]
