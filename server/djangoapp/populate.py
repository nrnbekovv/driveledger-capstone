from django.core.management import call_command


def initiate():
    call_command('seed_cars')
