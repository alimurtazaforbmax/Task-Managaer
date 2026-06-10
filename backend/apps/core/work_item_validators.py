from django.utils import timezone
from rest_framework import serializers


def validate_due_date_not_past(value):
    if value and value < timezone.now().date():
        raise serializers.ValidationError("Due date cannot be in the past.")
    return value


def validate_assignees_not_self(request, assignees, *, work_item_label: str = "work"):
    if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
        return assignees
    user_id = request.user.id
    for assignee in assignees or []:
        assignee_id = getattr(assignee, "id", assignee)
        if assignee_id == user_id:
            raise serializers.ValidationError(
                f"You cannot assign {work_item_label} to yourself."
            )
    return assignees


class AssigneeDueDateValidationMixin:
    work_item_label = "work"

    def validate_due_date(self, value):
        return validate_due_date_not_past(value)

    def validate_assignees(self, value):
        return validate_assignees_not_self(
            self.context.get("request"),
            value,
            work_item_label=self.work_item_label,
        )
