import json
from unittest.mock import patch
import requests
from django.contrib.auth.models import User
from django.test import TestCase, Client
from .models import CarMake, CarModel


class ApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('driver', password='TestOnly-Strong-804!', first_name='Test', last_name='Driver')
        make = CarMake.objects.create(name='Audi')
        CarModel.objects.create(car_make=make, name='A4', year=2023, type='Sedan', dealer_id=15)

    def post(self, path, data):
        return self.client.post('/djangoapp/' + path, json.dumps(data), content_type='application/json')

    def test_login_failure_logout_and_session(self):
        self.assertEqual(self.post('login', {'userName': 'driver', 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.post('login', {'userName': 'driver', 'password': 'TestOnly-Strong-804!'}).status_code, 200)
        self.assertTrue(self.client.get('/djangoapp/session').json()['authenticated'])
        self.assertEqual(self.client.get('/djangoapp/logout').status_code, 405)
        self.assertEqual(self.post('logout', {}).status_code, 200)
        self.assertFalse(self.client.get('/djangoapp/session').json()['authenticated'])

    def test_registration_validation_duplicates_and_hashing(self):
        data = {'userName': 'newdriver', 'email': 'driver@example.com', 'firstName': 'New', 'lastName': 'Driver', 'password': 'Sample-Strong-892!'}
        self.assertEqual(self.post('register', data).status_code, 201)
        self.assertTrue(User.objects.get(username='newdriver').check_password(data['password']))
        self.assertEqual(self.post('register', data).status_code, 409)
        data.update(userName='another', password='123')
        self.assertEqual(self.post('register', data).status_code, 400)

    def test_csrf_is_enforced_for_login_and_reviews(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post('/djangoapp/login', '{}', content_type='application/json').status_code, 403)
        token = client.get('/djangoapp/session').json()['csrfToken']
        result = client.post('/djangoapp/login', json.dumps({'userName': 'driver', 'password': 'TestOnly-Strong-804!'}), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(result.status_code, 200)

    def test_anonymous_reviews_are_rejected(self):
        self.assertEqual(self.post('add_review', {}).status_code, 401)

    @patch('djangoapp.restapis.post_review')
    @patch('djangoapp.restapis.analyze_review_sentiments', return_value={'sentiment': 'positive'})
    @patch('djangoapp.restapis.get_request', return_value=[{'id': 15}])
    def test_review_author_comes_from_session_and_car_is_validated(self, get, analyze, post):
        self.client.force_login(self.user)
        data = {'name': 'Impersonated Person', 'dealership': 15, 'review': 'Excellent service.',
                'purchase': True, 'purchase_date': '2026-01-01', 'car_make': 'Audi', 'car_model': 'A4', 'car_year': 2023}
        post.return_value = {'id': 10001, 'review': data['review']}
        self.assertEqual(self.post('add_review', data).status_code, 201)
        self.assertEqual(post.call_args.args[0]['name'], 'Test Driver')
        data['car_model'] = 'Unknown'
        self.assertEqual(self.post('add_review', data).status_code, 400)
        self.assertEqual(post.call_count, 1)

    @patch('djangoapp.restapis.get_request', side_effect=requests.ConnectionError('offline'))
    def test_upstream_failure_is_reported(self, get):
        self.assertEqual(self.client.get('/djangoapp/get_dealers').status_code, 503)

    def test_cars_include_both_make_and_model(self):
        data = self.client.get('/djangoapp/get_cars').json()
        self.assertEqual(data['CarModels'][0]['CarMake'], 'Audi')
        self.assertEqual(data['CarModels'][0]['CarModel'], 'A4')
        self.assertEqual(data['CarMakes'][0]['name'], 'Audi')

    def test_malformed_json_and_missing_fields_are_400(self):
        self.assertEqual(self.post('register', []).status_code, 400)
        self.assertEqual(self.post('login', {}).status_code, 400)
        self.assertEqual(self.client.post('/djangoapp/login', '{', content_type='application/json').status_code, 400)
