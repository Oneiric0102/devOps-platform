#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="devops-platform"

echo "Current Kubernetes context:"
kubectl config current-context

echo ""
echo "Nodes:"
kubectl get nodes

echo ""
echo "Pods:"
kubectl get pods -n "${NAMESPACE}"

echo ""
echo "Services:"
kubectl get svc -n "${NAMESPACE}"

echo ""
echo "Ingress:"
kubectl get ingress -n "${NAMESPACE}"

echo ""
echo "PVC:"
kubectl get pvc -n "${NAMESPACE}"

echo ""
echo "Backend rollout:"
kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=60s

echo ""
echo "Frontend rollout:"
kubectl rollout status deployment/frontend -n "${NAMESPACE}" --timeout=60s

echo ""
echo "Health check:"
curl -fsS http://localhost:8081/health

echo ""
echo ""
echo "Readiness check:"
curl -fsS http://localhost:8081/ready

echo ""
echo ""
echo "Todo API check:"
curl -fsS http://localhost:8081/api/todos

echo ""
echo ""
echo "Kubernetes check completed."