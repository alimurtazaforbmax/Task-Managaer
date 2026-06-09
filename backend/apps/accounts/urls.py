from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import (
    DepartmentViewSet,
    LoginView,
    MeView,
    PermissionListView,
    RefreshView,
    RegisterView,
    RoleViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("roles", RoleViewSet, basename="role")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("permissions/", PermissionListView.as_view(), name="permissions"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
