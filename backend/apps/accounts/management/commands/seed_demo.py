from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Department
from apps.bugs.models import Bug
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo users, departments, project, tasks, and bugs"

    def handle(self, *args, **options):
        backend, _ = Department.objects.get_or_create(
            name="Backend", defaults={"description": "Backend engineering"}
        )
        qa_dept, _ = Department.objects.get_or_create(
            name="QA", defaults={"description": "Quality assurance"}
        )

        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@example.com",
                "first_name": "System",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()

        pm, _ = User.objects.get_or_create(
            username="pm",
            defaults={
                "email": "pm@example.com",
                "first_name": "Pat",
                "last_name": "Manager",
                "role": "project_manager",
            },
        )
        if _:
            pm.set_password("demo123")
            pm.save()

        dev, _ = User.objects.get_or_create(
            username="dev",
            defaults={
                "email": "dev@example.com",
                "first_name": "Dana",
                "last_name": "Developer",
                "role": "developer",
                "department": backend,
            },
        )
        if _:
            dev.set_password("demo123")
            dev.save()

        qa, _ = User.objects.get_or_create(
            username="qa",
            defaults={
                "email": "qa@example.com",
                "first_name": "Quinn",
                "last_name": "Tester",
                "role": "qa",
                "department": qa_dept,
            },
        )
        if _:
            qa.set_password("demo123")
            qa.save()

        project, _ = Project.objects.get_or_create(
            code="demo-app",
            defaults={
                "name": "Demo Application",
                "description": "Sample project for Task Manager demo",
                "created_by": admin,
            },
        )
        for user, role in [(admin, "pm"), (pm, "pm"), (dev, "developer"), (qa, "qa")]:
            ProjectMember.objects.get_or_create(
                project=project, user=user, defaults={"role": role}
            )

        task, _ = Task.objects.get_or_create(
            project=project,
            title="Implement user dashboard",
            defaults={
                "description": "Build dashboard widgets for assigned work",
                "status": "in_progress",
                "priority": "high",
                "reporter": pm,
            },
        )
        task.assignees.add(dev)

        bug, _ = Bug.objects.get_or_create(
            project=project,
            title="Login button misaligned on mobile",
            defaults={
                "description": "Button overlaps footer on iPhone viewport",
                "steps_to_reproduce": "1. Open app on mobile\n2. Go to login\n3. Observe overlap",
                "environment": "iOS Safari",
                "status": "open",
                "severity": "medium",
                "reporter": qa,
            },
        )
        bug.assignees.add(dev)

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write("  admin / admin123")
        self.stdout.write("  pm, dev, qa / demo123")
