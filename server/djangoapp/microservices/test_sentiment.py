import unittest
from app import app


class SentimentTests(unittest.TestCase):
    def test_polarities(self):
        client = app.test_client()
        for text, expected in [('Fantastic services', 'positive'), ('Terrible awful service', 'negative'), ('The car is blue', 'neutral')]:
            response = client.get('/analyze/' + text)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['sentiment'], expected)
