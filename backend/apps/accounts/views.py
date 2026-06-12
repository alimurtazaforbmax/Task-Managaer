from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import Department
from apps.accounts.serializers import (
    DepartmentSerializer,
    PermissionSerializer,
    RegisterSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from apps.accounts.models import Permission, Role
from apps.accounts.department_summary import build_department_summary
from apps.accounts.report_permissions import (
    can_generate_user_report,
    can_view_user_profile,
    can_view_users_list,
)
from apps.accounts.team_permissions import (
    can_view_org_wide_users,
    can_view_team,
    teammate_user_ids,
)
from apps.accounts.team_summary import build_team_summary
from apps.accounts.user_report import build_user_report
from apps.accounts.user_summary import build_user_summary
from apps.core.permissions import IsAdmin
from apps.core.report_filters import parse_project_ids_param, parse_report_reference_param
from apps.core.responses import error_response, success_response
from apps.core.services import record_audit_log

User = get_user_model()


class TeamSummaryView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view_team(request.user):
            return error_response(
                "You do not have permission to view team progress.",
                status=status.HTTP_403_FORBIDDEN,
            )
        project_raw = request.query_params.get("project", "").strip()
        project_id = int(project_raw) if project_raw.isdigit() else None
        period = request.query_params.get("period")
        reference = parse_report_reference_param(request)
        search = request.query_params.get("search", "").strip() or None
        payload = build_team_summary(
            request.user,
            request,
            project_id=project_id,
            period=period,
            reference=reference,
            search=search,
        )
        if project_id and project_id not in {p["id"] for p in payload["projects"]}:
            return error_response(
                "Project not found or you are not a member.",
                status=status.HTTP_404_NOT_FOUND,
            )
        return success_response(data=payload)


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            data=UserSerializer(user).data,
            message="Account created successfully.",
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return User.objects.select_related("department", "access_role").get(
            pk=self.request.user.pk
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = UserSerializer(self.get_object(), context={"request": request})
        return success_response(data=serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(
            self.get_object(), data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            data=UserSerializer(user, context={"request": request}).data,
            message="Profile updated.",
        )


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            return success_response(
                data=response.data,
                message="Login successful.",
            )
        return response


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            return success_response(data=response.data, message="Token refreshed.")
        return response


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.prefetch_related("members").all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            self.get_object(), context={"request": request}
        )
        return success_response(data=serializer.data)

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        department = self.get_object()
        return success_response(
            data=build_department_summary(department, request)
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = serializer.save()
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="department",
            entity_id=department.id,
            entity_label=department.name,
        )
        return success_response(
            data=serializer.data,
            message="Department created.",
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        department = self.get_object()
        serializer = self.get_serializer(
            department, data=request.data, partial=kwargs.get("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="department",
            entity_id=department.id,
            entity_label=department.name,
        )
        return success_response(data=serializer.data, message="Department updated.")

    def destroy(self, request, *args, **kwargs):
        department = self.get_object()
        if department.members.exists():
            return error_response(
                "Cannot delete department with assigned users. Reassign users first.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="department",
            entity_id=department.id,
            entity_label=department.name,
        )
        department.delete()
        return success_response(message="Department deleted.", status=status.HTTP_200_OK)


class PermissionListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.all()
    pagination_class = None

    def list(self, request, *args, **kwargs):
        permissions = Permission.objects.all().order_by("category", "name")
        catalog = PermissionSerializer(permissions, many=True).data
        grouped: dict[str, list] = {}
        for perm in catalog:
            grouped.setdefault(perm["category"], []).append(perm)
        return success_response(data={"catalog": catalog, "grouped": grouped})


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related("permissions").all()
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "slug", "description"]
    filterset_fields = ["is_system"]
    create_message = "Role created."
    update_message = "Role updated."
    delete_message = "Role deleted."

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RoleWriteSerializer
        return RoleSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save(is_system=False, is_admin=False)
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="role",
            entity_id=role.id,
            entity_label=role.name,
        )
        return success_response(
            data=RoleSerializer(role).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_admin:
            return error_response(
                "The admin role cannot be modified.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(role, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="role",
            entity_id=role.id,
            entity_label=role.name,
        )
        return success_response(
            data=RoleSerializer(role).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return error_response(
                "System roles cannot be deleted.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role.users.exists():
            return error_response(
                "Cannot delete a role that is assigned to users.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="role",
            entity_id=role.id,
            entity_label=role.name,
        )
        role.delete()
        return success_response(message=self.delete_message)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("department", "access_role").all()
    permission_classes = [IsAuthenticated]
    search_fields = ["username", "email", "first_name", "last_name"]
    filterset_fields = ["access_role", "department", "is_active"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = User.objects.select_related("department", "access_role").all()
        actor = self.request.user
        if not actor or not actor.is_authenticated:
            return queryset.none()
        if can_view_org_wide_users(actor):
            return queryset
        if can_view_team(actor):
            return queryset.filter(id__in=teammate_user_ids(actor))
        return queryset.none()

    def list(self, request, *args, **kwargs):
        if not can_view_users_list(request.user):
            return error_response(
                "You do not have permission to view users.",
                status=status.HTTP_403_FORBIDDEN,
            )
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        if not can_view_user_profile(request.user, user):
            return error_response(
                "You do not have permission to view this user.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(user, context={"request": request})
        return success_response(data=serializer.data)

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        user = self.get_object()
        if not can_view_user_profile(request.user, user):
            return error_response(
                "You do not have permission to view this user profile.",
                status=status.HTTP_403_FORBIDDEN,
            )
        period = request.query_params.get("period")
        project_ids = parse_project_ids_param(request)
        reference = parse_report_reference_param(request)
        payload = build_user_summary(
            user,
            request,
            period=period,
            project_ids=project_ids,
            reference=reference,
        )
        payload["user"] = UserSerializer(user, context={"request": request}).data
        return success_response(data=payload)

    @action(detail=True, methods=["get"], url_path="report")
    def report(self, request, pk=None):
        user = self.get_object()
        if not can_generate_user_report(request.user, user):
            return error_response(
                "You do not have permission to generate this user report.",
                status=status.HTTP_403_FORBIDDEN,
            )
        period = request.query_params.get("period")
        project_ids = parse_project_ids_param(request)
        reference = parse_report_reference_param(request)
        if request.query_params.get("export") == "pdf":
            try:
                from apps.accounts.user_report import build_user_report_pdf

                pdf_bytes = build_user_report_pdf(
                    user,
                    request,
                    period=period,
                    project_ids=project_ids,
                    reference=reference,
                )
            except ModuleNotFoundError as exc:
                if exc.name == "reportlab":
                    return error_response(
                        "PDF reports require reportlab. Install dependencies with: pip install -r requirements.txt",
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                raise
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = (
                f'attachment; filename="user-report-{user.username}.pdf"'
            )
            return response
        return success_response(
            data=build_user_report(
                user,
                request,
                period=period,
                project_ids=project_ids,
                reference=reference,
            )
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="user",
            entity_id=user.id,
            entity_label=user.username,
        )
        return success_response(
            data=UserSerializer(user, context={"request": request}).data,
            message="User created.",
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=kwargs.get("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="user",
            entity_id=user.id,
            entity_label=user.username,
        )
        return success_response(
            data=UserSerializer(user, context={"request": request}).data,
            message="User updated.",
        )

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        record_audit_log(
            actor=request.user,
            action="deactivated",
            entity_type="user",
            entity_id=user.id,
            entity_label=user.username,
        )
        return success_response(message="User deactivated.")
