from django.db import migrations


def sync_assign_tasks_permission(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_planning_permissions"),
    ]

    operations = [
        migrations.RunPython(sync_assign_tasks_permission, migrations.RunPython.noop),
    ]
