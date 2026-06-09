from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import Department, Permission, Role, User
from apps.accounts.permissions_util import get_user_permissions


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "codename", "name", "category", "description")
        read_only_fields = fields


class RoleSerializer(serializers.ModelSerializer):
    permissions_detail = PermissionSerializer(source="permissions", many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        source="permissions",
        queryset=Permission.objects.all(),
        many=True,
        required=False,
    )
    user_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Role
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "is_system",
            "is_admin",
            "permissions_detail",
            "permission_ids",
            "user_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_system", "created_at", "updated_at", "user_count")


class RoleWriteSerializer(serializers.ModelSerializer):
    permission_ids = serializers.PrimaryKeyRelatedField(
        source="permissions",
        queryset=Permission.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Role
        fields = ("name", "slug", "description", "permission_ids")

    def validate_slug(self, value):
        value = value.strip().lower().replace(" ", "_")
        qs = Role.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this slug already exists.")
        return value

    def validate(self, attrs):
        if self.instance and self.instance.is_admin:
            raise serializers.ValidationError("The admin role cannot be modified.")
        return attrs


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    permissions_detail = PermissionSerializer(source="extra_permissions", many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        source="extra_permissions",
        queryset=Permission.objects.filter(
            codename__in=[
                "can_create_tasks",
                "can_create_bugs",
                "can_edit_tasks",
                "can_edit_bugs",
            ]
        ),
        many=True,
        required=False,
    )

    class Meta:
        model = Department
        fields = (
            "id",
            "name",
            "description",
            "permission_ids",
            "permissions_detail",
            "member_count",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "member_count", "permissions_detail")


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    role = serializers.CharField(source="access_role.slug", read_only=True)
    access_role_name = serializers.CharField(source="access_role.name", read_only=True)
    permissions = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "access_role",
            "access_role_name",
            "department",
            "department_name",
            "permissions",
            "job_title",
            "profile_picture",
            "profile_picture_url",
            "is_active",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "date_joined",
            "department_name",
            "role",
            "access_role_name",
            "permissions",
            "profile_picture_url",
        )

    def get_permissions(self, obj) -> dict[str, bool]:
        return get_user_permissions(obj)

    def get_profile_picture_url(self, obj) -> str | None:
        if not obj.profile_picture:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "access_role",
            "department",
            "job_title",
            "is_active",
            "password",
            "profile_picture",
        )

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate_profile_picture(self, value):
        if not value:
            return value
        try:
            validate_file_size(value, settings.MAX_IMAGE_SIZE_MB)
            validate_mime_type(value, settings.ALLOWED_IMAGE_TYPES)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        new_picture = validated_data.get("profile_picture")
        if new_picture and instance.profile_picture:
            instance.profile_picture.delete(save=False)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "access_role",
            "department",
            "job_title",
            "profile_picture",
        )

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_profile_picture(self, value):
        if not value:
            return value
        try:
            validate_file_size(value, settings.MAX_IMAGE_SIZE_MB)
            validate_mime_type(value, settings.ALLOWED_IMAGE_TYPES)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name")

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        from apps.accounts.models import Role

        password = validated_data.pop("password")
        default_role = Role.objects.filter(slug="developer").first()
        user = User(**validated_data, access_role=default_role)
        user.set_password(password)
        user.save()
        return user
