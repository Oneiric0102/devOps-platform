#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="devops-platform"

echo "Frontend rollout history:"
kubectl rollout history deployment/frontend -n "${NAMESPACE}"

echo ""
echo "Rolling back frontend deployment..."
kubectl rollout undo deployment/frontend -n "${NAMESPACE}"

echo ""
echo "Waiting for frontend rollback..."
kubectl rollout status deployment/frontend -n "${NAMESPACE}" --timeout=180s

echo ""
echo "Frontend pods:"
kubectl get pods -n "${NAMESPACE}" -l app=frontend

echo ""
echo "Frontend check:"
curl -fsS http://localhost:8081 > /dev/null

echo "Frontend rollback completed."