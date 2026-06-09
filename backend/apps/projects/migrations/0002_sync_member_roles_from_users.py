from django.db import migrations

ROLE_MAP = {
    "admin": "pm",
    "project_manager": "pm",
    "developer": "developer",
    "qa": "qa",
    "viewer": "viewer",
}


def sync_member_roles(apps, schema_editor):
    ProjectMember = apps.get_model("projects", "ProjectMember")
    User = apps.get_model("accounts", "User")

    for member in ProjectMember.objects.all().iterator():
        user = User.objects.filter(pk=member.user_id).first()
        if not user:
            continue
        role = ROLE_MAP.get(user.role, "developer")
        if member.role != role:
            member.role = role
            member.save(update_fields=["role"])


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0001_initial"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(sync_member_roles, migrations.RunPython.noop),
    ]
