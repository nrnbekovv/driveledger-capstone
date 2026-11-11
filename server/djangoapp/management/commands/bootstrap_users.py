import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create initial accounts only when passwords are supplied in environment variables.'

    def handle(self, *args, **options):
        admin_password = os.getenv('DJANGO_SUPERUSER_PASSWORD')
        if admin_password:
            name = os.getenv('DJANGO_SUPERUSER_USERNAME', 'root')
            if not User.objects.filter(username=name).exists():
                User.objects.create_superuser(name, os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com'), admin_password)
                self.stdout.write('Administrator created.')
        demo_password = os.getenv('DEMO_PASSWORD')
        if demo_password:
            name = os.getenv('DEMO_USERNAME', 'capstone_driver')
            if not User.objects.filter(username=name).exists():
                User.objects.create_user(name, 'driver@example.com', demo_password, first_name='Capstone', last_name='Driver')
                self.stdout.write('Demo driver created.')
