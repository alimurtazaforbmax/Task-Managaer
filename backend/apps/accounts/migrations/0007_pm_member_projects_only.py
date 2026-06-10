from django.db import migrations


def sync_pm_project_visibility(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_assign_tasks_permission"),
    ]

    operations = [
        migrations.RunPython(sync_pm_project_visibility, migrations.RunPython.noop),
    ]
