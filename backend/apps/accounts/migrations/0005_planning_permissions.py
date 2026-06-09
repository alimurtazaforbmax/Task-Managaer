from django.db import migrations


def sync_planning_permissions(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_rbac_system"),
    ]

    operations = [
        migrations.RunPython(sync_planning_permissions, migrations.RunPython.noop),
    ]
