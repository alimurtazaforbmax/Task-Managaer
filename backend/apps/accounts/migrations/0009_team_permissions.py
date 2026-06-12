from django.db import migrations


def sync_team_permissions(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_report_permissions"),
    ]

    operations = [
        migrations.RunPython(sync_team_permissions, migrations.RunPython.noop),
    ]
