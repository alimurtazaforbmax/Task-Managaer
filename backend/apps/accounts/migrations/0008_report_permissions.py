from django.db import migrations


def sync_report_permissions(apps, schema_editor):
    from apps.accounts.rbac_seed import sync_permissions, sync_system_roles

    permissions = sync_permissions()
    sync_system_roles(permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_pm_member_projects_only"),
    ]

    operations = [
        migrations.RunPython(sync_report_permissions, migrations.RunPython.noop),
    ]
