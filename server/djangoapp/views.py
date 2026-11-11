import json
import logging
from datetime import date
from functools import wraps
from urllib.parse import quote
import requests
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from .models import CarMake, CarModel
from . import restapis

logger = logging.getLogger(__name__)


def api_errors(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError, TypeError, KeyError) as exc:
            return JsonResponse({'error': str(exc) or 'Invalid request.'}, status=400)
        except requests.RequestException:
            logger.exception('A backend service request failed')
            return JsonResponse({'error': 'A backend service is unavailable. Please try again.'}, status=503)
    return wrapped


def body(request):
    data = json.loads(request.body)
    if not isinstance(data, dict):
        raise ValueError('Expected a JSON object.')
    return data


def text_field(data, key, limit=150):
    value = data.get(key, '')
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f'{key} is required and must be at most {limit} characters.')
    return value.strip()


@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')


@require_GET
def session(request):
    user = request.user
    return JsonResponse({'authenticated': user.is_authenticated, 'csrfToken': get_token(request),
        'userName': user.username if user.is_authenticated else '',
        'firstName': user.first_name if user.is_authenticated else '',
        'lastName': user.last_name if user.is_authenticated else ''})


@require_POST
@api_errors
def login_user(request):
    data = body(request)
    username = text_field(data, 'userName')
    password = data.get('password')
    if not isinstance(password, str) or len(password) > 128:
        raise ValueError('Invalid password.')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Incorrect username or password.'}, status=401)
    login(request, user)
    return JsonResponse({'status': 'Authenticated', 'userName': user.username, 'csrfToken': get_token(request)})


@require_POST
def logout_request(request):
    logout(request)
    return JsonResponse({'status': 'Logged out', 'csrfToken': get_token(request)})


@require_POST
@api_errors
def registration(request):
    data = body(request)
    username = text_field(data, 'userName')
    email = text_field(data, 'email', 254)
    first = text_field(data, 'firstName')
    last = text_field(data, 'lastName')
    password = data.get('password')
    if not isinstance(password, str) or len(password) > 128:
        raise ValueError('Password must be at most 128 characters.')
    user = User(username=username, email=email, first_name=first, last_name=last)
    try:
        User._meta.get_field('username').run_validators(username)
        validate_email(email)
        validate_password(password, user=user)
    except ValidationError as exc:
        return JsonResponse({'error': ' '.join(exc.messages)}, status=400)
    try:
        user.set_password(password)
        user.save()
    except IntegrityError:
        return JsonResponse({'error': 'This username is already taken.'}, status=409)
    login(request, user)
    return JsonResponse({'status': 'Authenticated', 'userName': user.username, 'csrfToken': get_token(request)}, status=201)


@require_GET
@api_errors
def get_dealerships(request, state='All'):
    endpoint = 'fetchDealers' if state == 'All' else f'fetchDealers/{quote(state, safe="")}'
    return JsonResponse({'status': 200, 'dealers': restapis.get_request(endpoint)})


@require_GET
@api_errors
def get_dealer_details(request, dealer_id):
    dealer = restapis.get_request(f'fetchDealer/{dealer_id}')
    if not dealer:
        return JsonResponse({'error': 'Dealer not found.'}, status=404)
    return JsonResponse({'status': 200, 'dealer': dealer})


@require_GET
@api_errors
def get_dealer_reviews(request, dealer_id):
    reviews = restapis.get_request(f'fetchReviews/dealer/{dealer_id}')
    for review in reviews:
        if not review.get('sentiment'):
            try:
                review['sentiment'] = restapis.analyze_review_sentiments(review['review'])['sentiment']
            except requests.RequestException:
                review['sentiment'] = 'unavailable'
    return JsonResponse({'status': 200, 'reviews': reviews})


@require_GET
def get_cars(request):
    cars = [{'id': car.pk, 'CarMake': car.car_make.name, 'CarModel': car.name,
        'CarYear': car.year, 'type': car.type, 'dealer_id': car.dealer_id}
        for car in CarModel.objects.select_related('car_make')]
    return JsonResponse({'status': 200, 'CarMakes': list(CarMake.objects.values('id', 'name', 'description')), 'CarModels': cars})


@require_GET
@api_errors
def analyze_review(request, text):
    if len(text) > 4000:
        raise ValueError('Review is too long.')
    return JsonResponse(restapis.analyze_review_sentiments(text))


@require_POST
@api_errors
def add_review(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in to post a review.'}, status=401)
    data = body(request)
    review = text_field(data, 'review', 4000)
    dealer_id = int(data['dealership'])
    if not restapis.get_request(f'fetchDealer/{dealer_id}'):
        return JsonResponse({'error': 'Dealer not found.'}, status=404)
    if not isinstance(data.get('purchase'), bool):
        raise ValueError('purchase must be true or false.')
    purchase = data['purchase']
    payload = {'name': request.user.get_full_name() or request.user.username, 'dealership': dealer_id,
        'review': review, 'purchase': purchase, 'purchase_date': '', 'car_make': '', 'car_model': '', 'car_year': None}
    if purchase:
        purchase_date = date.fromisoformat(text_field(data, 'purchase_date', 10))
        if purchase_date > date.today():
            raise ValueError('Purchase date cannot be in the future.')
        make = text_field(data, 'car_make', 80)
        model = text_field(data, 'car_model', 80)
        year = int(data['car_year'])
        if not CarModel.objects.filter(car_make__name=make, name=model, year=year).exists():
            raise ValueError('Choose a make, model, and year from the catalogue.')
        payload.update(purchase_date=purchase_date.isoformat(), car_make=make, car_model=model, car_year=year)
    payload['sentiment'] = restapis.analyze_review_sentiments(review)['sentiment']
    result = restapis.post_review(payload)
    return JsonResponse({'status': 201, 'review': result}, status=201)


@require_GET
@api_errors
def health(request):
    return JsonResponse({'status': 'ok', 'database': restapis.get_request('health')['status'],
        'sentiment': restapis.analyze_review_sentiments('Fantastic services')['sentiment']})
