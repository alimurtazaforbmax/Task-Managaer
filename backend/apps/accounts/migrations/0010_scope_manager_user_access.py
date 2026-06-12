from django.db import migrations


def scope_manager_user_access(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_team_permissions"),
    ]

    operations = [
        migrations.RunPython(scope_manager_user_access, migrations.RunPython.noop),
    ]
