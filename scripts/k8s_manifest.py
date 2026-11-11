"""Emit a four-container laboratory deployment. Data persists across container restarts, not pod deletion."""
import argparse
import json

p = argparse.ArgumentParser()
p.add_argument('--image-prefix', required=True)
p.add_argument('--tag', required=True)
args = p.parse_args()
image = lambda service: f'{args.image_prefix}-{service}:{args.tag}'
resources = lambda memory: {'requests': {'cpu': '50m', 'memory': '64Mi'}, 'limits': {'cpu': '500m', 'memory': memory}}
env = lambda values: [{'name': key, 'value': value} for key, value in values.items()]
web = {
    'name': 'web', 'image': image('web'), 'imagePullPolicy': 'Always',
    'ports': [{'containerPort': 8000}], 'resources': resources('384Mi'),
    'envFrom': [{'secretRef': {'name': 'driveledger-secrets'}}, {'configMapRef': {'name': 'driveledger-config'}}],
    'env': env({'DJANGO_DB_PATH': '/data/db.sqlite3', 'BACKEND_URL': 'http://127.0.0.1:3030', 'SENTIMENT_URL': 'http://127.0.0.1:5050'}),
    'volumeMounts': [{'name': 'django-data', 'mountPath': '/data'}],
    'readinessProbe': {'exec': {'command': ['python', '-c', "import urllib.request; urllib.request.urlopen('http://localhost:8000/djangoapp/health')"]}, 'initialDelaySeconds': 15, 'periodSeconds': 10, 'timeoutSeconds': 15},
    'livenessProbe': {'tcpSocket': {'port': 8000}, 'initialDelaySeconds': 90, 'periodSeconds': 20},
}
api = {
    'name': 'api', 'image': image('api'), 'imagePullPolicy': 'Always',
    'envFrom': [{'secretRef': {'name': 'driveledger-secrets'}}],
    'env': env({'MONGO_URL': 'mongodb://127.0.0.1:27017/driveledger', 'HOST': '127.0.0.1'}),
    'resources': resources('256Mi'),
}
sentiment = {
    'name': 'sentiment', 'image': image('sentiment'), 'imagePullPolicy': 'Always',
    'env': env({'HOST': '127.0.0.1'}), 'resources': resources('192Mi'),
}
mongo = {
    'name': 'mongo', 'image': 'mongo:8.0', 'command': ['mongod'],
    'args': ['--bind_ip', '127.0.0.1', '--dbpath', '/data/db', '--wiredTigerCacheSizeGB', '0.25'],
    'resources': resources('512Mi'),
    'volumeMounts': [{'name': 'mongo-data', 'mountPath': '/data/db'}],
}
items = [
    {'apiVersion': 'apps/v1', 'kind': 'Deployment', 'metadata': {'name': 'driveledger'},
     'spec': {'replicas': 1, 'strategy': {'type': 'Recreate'}, 'selector': {'matchLabels': {'app': 'driveledger'}},
              'template': {'metadata': {'labels': {'app': 'driveledger'}}, 'spec': {
                  'containers': [web, api, sentiment, mongo],
                  'volumes': [{'name': 'django-data', 'emptyDir': {}}, {'name': 'mongo-data', 'emptyDir': {}}],
              }}}},
    {'apiVersion': 'v1', 'kind': 'Service', 'metadata': {'name': 'driveledger'},
     'spec': {'selector': {'app': 'driveledger'}, 'ports': [{'name': 'http', 'port': 8000, 'targetPort': 8000}]}},
]
print(json.dumps({'apiVersion': 'v1', 'kind': 'List', 'items': items}, indent=2))
