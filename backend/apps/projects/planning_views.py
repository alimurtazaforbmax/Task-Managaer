from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions_util import is_admin_user, user_has_permission
from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.responses import error_response, success_response
from apps.core.services import record_audit_log
from apps.projects.models import Feature, Sprint
from apps.projects.serializers import (
    FeatureListSerializer,
    FeatureSerializer,
    FeatureUpdateSerializer,
    SprintListSerializer,
    SprintSerializer,
    SprintUpdateSerializer,
)


def _user_can_edit_feature(user, feature) -> bool:
    if user_has_permission(user, "can_edit_features"):
        return True
    if is_admin_user(user):
        return True
    if feature.created_by_id == user.id:
        return True
    if feature.owner_id == user.id:
        return True
    return False


def _user_can_delete_feature(user, feature) -> bool:
    if user_has_permission(user, "can_delete_features"):
        return True
    if is_admin_user(user):
        return True
    if feature.created_by_id == user.id:
        return True
    if feature.owner_id == user.id:
        return True
    return False


def _user_can_edit_sprint(user, sprint) -> bool:
    if user_has_permission(user, "can_edit_sprints"):
        return True
    if is_admin_user(user):
        return True
    return sprint.created_by_id == user.id


def _user_can_delete_sprint(user, sprint) -> bool:
    if user_has_permission(user, "can_delete_sprints"):
        return True
    if is_admin_user(user):
        return True
    return sprint.created_by_id == user.id


class FeatureViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description"]
    filterset_fields = ["status", "priority", "project", "owner"]
    ordering_fields = ["updated_at", "target_date", "created_at"]
    create_message = "Feature created."
    update_message = "Feature updated."
    delete_message = "Feature deleted."

    def get_queryset(self):
        return Feature.objects.select_related(
            "project", "owner", "created_by"
        ).filter(project_id__in=user_project_ids(self.request.user))

    def get_serializer_class(self):
        if self.action == "list":
            return FeatureListSerializer
        if self.action in ("update", "partial_update"):
            return FeatureUpdateSerializer
        return FeatureSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if not user_has_permission(request.user, "can_create_features"):
            return error_response(
                "You do not have permission to create features.",
                status=status.HTTP_403_FORBIDDEN,
            )
        project_id = request.data.get("project")
        if not project_id or int(project_id) not in set(user_project_ids(request.user)):
            return error_response(
                "You must be a member of the project to create a feature.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feature = serializer.save(
            created_by=request.user,
            owner=serializer.validated_data.get("owner") or request.user,
        )
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="feature",
            entity_id=feature.id,
            entity_label=feature.title,
        )
        return success_response(
            data=FeatureSerializer(feature, context={"request": request}).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        feature = self.get_object()
        if not _user_can_edit_feature(request.user, feature):
            return error_response(
                "You do not have permission to edit this feature.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(feature, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        feature.refresh_from_db()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="feature",
            entity_id=feature.id,
            entity_label=feature.title,
        )
        return success_response(
            data=FeatureSerializer(feature, context={"request": request}).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        feature = self.get_object()
        if not _user_can_delete_feature(request.user, feature):
            return error_response(
                "You do not have permission to delete this feature.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="feature",
            entity_id=feature.id,
            entity_label=feature.title,
        )
        return super().destroy(request, *args, **kwargs)


class SprintViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "goal", "description"]
    filterset_fields = ["status", "project"]
    ordering_fields = ["start_date", "end_date", "updated_at"]
    create_message = "Sprint created."
    update_message = "Sprint updated."
    delete_message = "Sprint deleted."

    def get_queryset(self):
        return Sprint.objects.select_related("project", "created_by").filter(
            project_id__in=user_project_ids(self.request.user)
        )

    def get_serializer_class(self):
        if self.action == "list":
            return SprintListSerializer
        if self.action in ("update", "partial_update"):
            return SprintUpdateSerializer
        return SprintSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if not user_has_permission(request.user, "can_create_sprints"):
            return error_response(
                "You do not have permission to create sprints.",
                status=status.HTTP_403_FORBIDDEN,
            )
        project_id = request.data.get("project")
        if not project_id or int(project_id) not in set(user_project_ids(request.user)):
            return error_response(
                "You must be a member of the project to create a sprint.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sprint = serializer.save(created_by=request.user)
        record_audit_log(
            actor=request.user,
            action="created",
            entity_type="sprint",
            entity_id=sprint.id,
            entity_label=sprint.name,
        )
        return success_response(
            data=SprintSerializer(sprint, context={"request": request}).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        sprint = self.get_object()
        if not _user_can_edit_sprint(request.user, sprint):
            return error_response(
                "You do not have permission to edit this sprint.",
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(sprint, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        sprint.refresh_from_db()
        record_audit_log(
            actor=request.user,
            action="updated",
            entity_type="sprint",
            entity_id=sprint.id,
            entity_label=sprint.name,
        )
        return success_response(
            data=SprintSerializer(sprint, context={"request": request}).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        sprint = self.get_object()
        if not _user_can_delete_sprint(request.user, sprint):
            return error_response(
                "You do not have permission to delete this sprint.",
                status=status.HTTP_403_FORBIDDEN,
            )
        record_audit_log(
            actor=request.user,
            action="deleted",
            entity_type="sprint",
            entity_id=sprint.id,
            entity_label=sprint.name,
        )
        return super().destroy(request, *args, **kwargs)
