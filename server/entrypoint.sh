#!/bin/sh
set -eu
python manage.py migrate --noinput
python manage.py seed_cars
python manage.py bootstrap_users
exec gunicorn djangoproj.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 4 --timeout 60 --access-logfile -
