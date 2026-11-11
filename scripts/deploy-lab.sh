#!/usr/bin/env bash
# Run from the repository root in the course's Cloud IDE.
set -euo pipefail
cd "$(dirname "$0")/.."
namespace="$(oc project -q)"
case "$namespace" in sn-labs-*) ;; *) echo "Expected your own sn-labs namespace; got $namespace"; exit 1;; esac
registry="us.icr.io"
prefix="$registry/$namespace/driveledger"
tag="$(git rev-parse --short HEAD)"
mkdir -p .local
if [ ! -f .local/deployment.env ]; then
  umask 077
  {
    printf 'DJANGO_SECRET_KEY=%s\n' "$(openssl rand -hex 40)"
    printf 'BACKEND_API_KEY=%s\n' "$(openssl rand -hex 32)"
    printf 'DJANGO_SUPERUSER_PASSWORD=%s\n' "$(openssl rand -hex 16)"
    printf 'DEMO_PASSWORD=%s\n' "$(openssl rand -hex 16)"
  } > .local/deployment.env
fi
kubectl create secret generic driveledger-secrets --from-env-file=.local/deployment.env --dry-run=client -o yaml | kubectl apply -f -
kubectl create configmap driveledger-config --from-literal=DJANGO_DEBUG=false --from-literal=DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1 --from-literal=COOKIE_SECURE=true --dry-run=client -o yaml | kubectl apply -f -
ibmcloud cr login
docker build -f server/Dockerfile -t "$prefix-web:$tag" .
docker build -t "$prefix-api:$tag" server/database
docker build -t "$prefix-sentiment:$tag" server/djangoapp/microservices
docker push "$prefix-web:$tag"
docker push "$prefix-api:$tag"
docker push "$prefix-sentiment:$tag"
python3 scripts/k8s_manifest.py --image-prefix "$prefix" --tag "$tag" > .local/deployment.json
kubectl apply -f .local/deployment.json
# A route may be unavailable in some lab clusters; use port-forward + Launch Application then.
if oc get route driveledger >/dev/null 2>&1 || oc create route edge driveledger --service=driveledger --port=8000 --insecure-policy=Redirect; then
  host="$(oc get route driveledger -o jsonpath='{.spec.host}')"
  kubectl create configmap driveledger-config --from-literal=DJANGO_DEBUG=false --from-literal="DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$host" --from-literal="CSRF_TRUSTED_ORIGINS=https://$host" --from-literal=COOKIE_SECURE=true --dry-run=client -o yaml | kubectl apply -f -
  kubectl rollout restart deployment/driveledger
  printf 'https://%s\n' "$host" > .local/deploymentURL
fi
kubectl rollout status deployment/driveledger --timeout=300s
kubectl get pods -l app=driveledger
if [ -f .local/deploymentURL ]; then
  cat .local/deploymentURL
else
  echo "Run: kubectl port-forward deployment/driveledger 8000:8000 --address=0.0.0.0"
  echo "Then open port 8000 using Launch Application in the Skills Network toolbox."
fi
