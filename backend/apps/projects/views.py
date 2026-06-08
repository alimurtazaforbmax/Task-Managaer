from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import StandardResponseMixin, user_project_ids
from apps.core.permissions import IsAdmin
from apps.core.responses import error_response, success_response
from apps.core.utils import validate_file_size, validate_mime_type
from apps.projects.models import Project, ProjectDocument, ProjectMember
from apps.projects.serializers import (
    ProjectDetailSerializer,
    ProjectDocumentSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    ProjectWriteSerializer,
)


class ProjectViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "code", "description"]
    filterset_fields = ["status"]
    create_message = "Project created."
    update_message = "Project updated."
    delete_message = "Project archived."

    def get_queryset(self):
        qs = Project.objects.prefetch_related("members__user").all()
        if self.request.user.role != "admin":
            qs = qs.filter(id__in=user_project_ids(self.request.user))
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectWriteSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return success_response(
            data=ProjectDetailSerializer(project, context={"request": request}).data,
            message=self.create_message,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return success_response(
            data=ProjectDetailSerializer(project, context={"request": request}).data,
            message=self.update_message,
        )

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        project.status = "archived"
        project.save(update_fields=["status", "updated_at"])
        return success_response(message="Project archived.")

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            serializer = ProjectMemberSerializer(
                project.members.select_related("user"), many=True
            )
            return success_response(data=serializer.data)
        if request.user.role != "admin":
            return error_response(
                "Only admin can add members.",
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ProjectMemberSerializer(data={**request.data, "project": project.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=serializer.data,
            message="Member added.",
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="documents")
    def documents(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            docs = project.documents.select_related("uploaded_by")
            serializer = ProjectDocumentSerializer(
                docs, many=True, context={"request": request}
            )
            return success_response(data=serializer.data)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return error_response("File is required.", status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_file_size(file_obj, settings.MAX_DOCUMENT_SIZE_MB)
            validate_mime_type(file_obj, settings.ALLOWED_DOCUMENT_TYPES)
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        doc = ProjectDocument.objects.create(
            project=project,
            title=request.data.get("title") or file_obj.name,
            file=file_obj,
            original_name=file_obj.name,
            mime_type=getattr(file_obj, "content_type", ""),
            size_bytes=file_obj.size,
            uploaded_by=request.user,
        )
        serializer = ProjectDocumentSerializer(doc, context={"request": request})
        return success_response(
            data=serializer.data,
            message="Document uploaded.",
            status=status.HTTP_201_CREATED,
        )


class ProjectMemberViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [IsAuthenticated]
    queryset = ProjectMember.objects.select_related("user", "project")
    create_message = "Member added."
    update_message = "Member updated."
    delete_message = "Member removed."

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role != "admin":
            qs = qs.filter(project_id__in=user_project_ids(self.request.user))
        return qs
