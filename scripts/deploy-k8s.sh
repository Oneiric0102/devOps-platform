#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="devops-platform"

echo "Current Kubernetes context:"
kubectl config current-context

echo ""
echo "Applying Kubernetes manifests..."

if [ ! -f k8s/secret.yaml ]; then
  echo "Missing k8s/secret.yaml."
  echo "Create it from k8s/secret.example.yaml and set real secret values before deploying."
  exit 1
fi

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

echo ""
echo "Waiting for database and cache..."

kubectl rollout status statefulset/postgres -n "${NAMESPACE}" --timeout=180s
kubectl rollout status deployment/redis -n "${NAMESPACE}" --timeout=180s

kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

echo ""
echo "Restarting application deployments to pull latest master images..."

kubectl rollout restart deployment/backend -n "${NAMESPACE}"
kubectl rollout restart deployment/frontend -n "${NAMESPACE}"

echo ""
echo "Waiting for application rollout..."

kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=180s
kubectl rollout status deployment/frontend -n "${NAMESPACE}" --timeout=180s

echo ""
echo "Application resources:"
kubectl get all -n "${NAMESPACE}"

echo ""
echo "Ingress:"
kubectl get ingress -n "${NAMESPACE}"

echo ""
echo "Smoke test:"
curl -fsS http://localhost:8081/health
echo ""
curl -fsS http://localhost:8081/ready
echo ""

echo ""
echo "Kubernetes deployment completed."
