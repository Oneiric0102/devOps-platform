#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="devops-platform"

echo "Backend rollout history:"
kubectl rollout history deployment/backend -n "${NAMESPACE}"

echo ""
echo "Rolling back backend deployment..."
kubectl rollout undo deployment/backend -n "${NAMESPACE}"

echo ""
echo "Waiting for backend rollback..."
kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=180s

echo ""
echo "Backend pods:"
kubectl get pods -n "${NAMESPACE}" -l app=backend

echo ""
echo "Readiness check:"
curl -fsS http://localhost:8081/ready

echo ""
echo ""
echo "Backend rollback completed."