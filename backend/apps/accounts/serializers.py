from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import Department, User
from apps.accounts.permissions_util import get_department_permissions


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Department
        fields = (
            "id",
            "name",
            "description",
            "can_create_tasks",
            "can_create_bugs",
            "can_edit_tasks",
            "can_edit_bugs",
            "member_count",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "member_count")


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "department",
            "department_name",
            "permissions",
            "job_title",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined", "department_name", "permissions")

    def get_permissions(self, obj) -> dict[str, bool]:
        return get_department_permissions(obj)


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "role",
            "department",
            "job_title",
            "is_active",
            "password",
        )

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
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
            "role",
            "department",
            "job_title",
        )

    def validate_password(self, value):
        validate_password(value)
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
        password = validated_data.pop("password")
        user = User(**validated_data, role="developer")
        user.set_password(password)
        user.save()
        return user
