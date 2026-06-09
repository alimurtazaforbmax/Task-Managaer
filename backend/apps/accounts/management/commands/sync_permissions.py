from django.core.management.base import BaseCommand

from apps.accounts.rbac_seed import sync_permissions, sync_system_roles


class Command(BaseCommand):
    help = "Sync permission catalog and system roles from registry"

    def handle(self, *args, **options):
        permissions = sync_permissions()
        roles = sync_system_roles(permissions)
        self.stdout.write(
            self.style.SUCCESS(
                f"Synced {len(permissions)} permissions and {len(roles)} system roles."
            )
        )
