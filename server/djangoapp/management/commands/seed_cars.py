import json
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from djangoapp.models import CarMake, CarModel


class Command(BaseCommand):
    help = 'Import IBM starter car records without deleting existing cars.'

    @transaction.atomic
    def handle(self, *args, **options):
        records = json.loads((settings.BASE_DIR / 'database/data/car_records.json').read_text())['cars']
        for record in records:
            make, _ = CarMake.objects.get_or_create(name=record['make'], defaults={
                'description': f"Explore {record['make']} vehicles in the dealership network."})
            CarModel.objects.get_or_create(car_make=make, name=record['model'], year=record['year'],
                dealer_id=record['dealer_id'], defaults={'type': record['bodyType']})
        self.stdout.write(self.style.SUCCESS(f'{CarMake.objects.count()} makes and {CarModel.objects.count()} models available.'))
