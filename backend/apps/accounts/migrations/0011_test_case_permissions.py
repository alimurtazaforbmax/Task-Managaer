from django.db import migrations


def sync_test_case_permissions(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_scope_manager_user_access"),
    ]

    operations = [
        migrations.RunPython(sync_test_case_permissions, migrations.RunPython.noop),
    ]
