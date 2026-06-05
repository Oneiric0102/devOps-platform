# Kubernetes 배포 문서

## 1. 배포 범위

본 문서는 DevOps Platform Portfolio 프로젝트의 Kubernetes 배포 구성을 정리한다.  
Docker Compose 기반 통합 실행 환경을 kind 기반 Kubernetes 클러스터 배포 구조로 확장한 범위다.

포함 항목:

```text
- kind 기반 로컬 Kubernetes 클러스터 구성
- namespace 기반 리소스 분리
- ConfigMap, Secret 기반 런타임 설정 분리
- PostgreSQL StatefulSet 및 PVC 구성
- Redis Deployment 및 Service 구성
- Backend, Frontend Deployment 구성
- ingress-nginx 기반 외부 트래픽 라우팅
- Probe, rollout, restart, scale, rollback 검증 구조
```

## 2. 배포 환경

| 항목 | 값 |
|---|---|
| 서버 | Oracle Cloud Ubuntu Instance |
| Kubernetes 환경 | kind |
| Container Registry | GitHub Container Registry |
| Ingress Controller | ingress-nginx |
| 외부 접근 포트 | `8081` |
| Namespace | `devops-platform` |

## 3. 전체 구조

```text
Client
  ↓
localhost:8081
  ↓
kind extraPortMappings
  ↓
ingress-nginx
  ↓
frontend Service
  ↓
frontend Pod
  ↓
Nginx reverse proxy
  ↓
backend Service
  ↓
backend Pod
  ↓
PostgreSQL / Redis
```

Frontend는 React 빌드 결과물을 Nginx로 제공한다.  
Backend는 Node.js Express 기반 Todo API와 운영용 엔드포인트를 제공한다.  
PostgreSQL은 Todo 데이터를 저장하며, Redis는 Todo 목록 조회 캐시로 사용한다.

## 4. 디렉터리 구조

```text
devOps-platform
├─ kind
│  └─ kind-config.yaml
├─ k8s
│  ├─ namespace.yaml
│  ├─ configmap.yaml
│  ├─ secret.yaml
│  ├─ postgres.yaml
│  ├─ redis.yaml
│  ├─ backend.yaml
│  ├─ frontend.yaml
│  └─ ingress.yaml
└─ docs
   └─ kubernetes.md
```

`kind/` 디렉터리는 kind 클러스터 설정을 포함한다.  
`k8s/` 디렉터리는 `kubectl apply` 대상 Kubernetes manifest를 포함한다.

## 5. kind 클러스터 구성

`kind/kind-config.yaml`은 `devops-platform` 클러스터와 control-plane 포트 매핑을 정의한다.

```text
hostPort 8081
  ↓
control-plane containerPort 80
  ↓
ingress-nginx
```

설정 범위:

```text
- cluster name: devops-platform
- node role: control-plane
- hostPort: 8081
- containerPort: 80
- protocol: TCP
```

## 6. Kubernetes 리소스 구성

| 파일 | 리소스 | 역할 |
|---|---|---|
| `namespace.yaml` | Namespace | 프로젝트 리소스 격리 |
| `configmap.yaml` | ConfigMap | 런타임 설정값 관리 |
| `secret.yaml` | Secret | 데이터베이스 비밀번호 관리 |
| `postgres.yaml` | Service, PVC, StatefulSet, ConfigMap | PostgreSQL 실행 및 데이터 유지 |
| `redis.yaml` | Service, Deployment | Redis 캐시 실행 |
| `backend.yaml` | Service, Deployment | Backend API 서버 실행 |
| `frontend.yaml` | Service, Deployment | Frontend Nginx 실행 |
| `ingress.yaml` | Ingress | 외부 HTTP 요청 라우팅 |

## 7. 설정 구성

ConfigMap은 민감하지 않은 애플리케이션 설정을 관리한다.

```text
NODE_ENV=production
PORT=3000
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=devops_platform
DATABASE_USER=devops_user
REDIS_HOST=redis
REDIS_PORT=6379
CORS_ORIGIN=http://localhost:8081
LOG_LEVEL=info
```

Secret은 데이터베이스 접속에 필요한 민감값을 관리한다.

```text
DATABASE_PASSWORD
POSTGRES_PASSWORD
```

Kubernetes 내부 통신은 Service 이름을 기준으로 한다.  
Backend는 PostgreSQL을 `postgres`, Redis를 `redis` 호스트로 참조한다.

## 8. 데이터 계층

### 8-1. PostgreSQL

PostgreSQL은 Todo 데이터의 영구 저장소다.

구성 항목:

```text
- Service: postgres
- StatefulSet: postgres
- PersistentVolumeClaim: postgres-pvc
- ConfigMap: postgres-init-sql
- Image: postgres:16-alpine
- Port: 5432
```

`postgres-pvc`는 `/var/lib/postgresql/data` 경로에 마운트된다.  
`postgres-init-sql` ConfigMap은 초기 Todo 테이블 생성 SQL을 제공한다.

생성 테이블:

```text
todos
```

주요 컬럼:

```text
id
title
description
completed
created_at
updated_at
```

### 8-2. Redis

Redis는 Todo 목록 조회 캐시로 사용한다.

구성 항목:

```text
- Service: redis
- Deployment: redis
- Image: redis:7-alpine
- Port: 6379
- Command: redis-server --appendonly yes
```

캐시 흐름:

```text
GET /api/todos
  ↓
todos:all 캐시 조회
  ↓
캐시 적중 시 Redis 데이터 반환
  ↓
캐시 미적중 시 PostgreSQL 조회
  ↓
조회 결과 Redis 저장
```

Todo 생성, 수정, 삭제 시 `todos:all` 캐시를 삭제한다.

## 9. 애플리케이션 계층

### 9-1. Backend

Backend는 GHCR에 배포된 Docker image를 사용한다.

```text
ghcr.io/oneiric0102/devops-platform-backend:master
```

구성 항목:

```text
- Service: backend
- Deployment: backend
- Port: 3000
- Strategy: RollingUpdate
- Replicas: 1
```

Probe 구성:

| Probe | Endpoint | 역할 |
|---|---|---|
| readinessProbe | `/ready` | PostgreSQL, Redis 연결 상태 확인 |
| livenessProbe | `/health` | Backend 프로세스 생존 상태 확인 |

### 9-2. Frontend

Frontend는 GHCR에 배포된 Docker image를 사용한다.

```text
ghcr.io/oneiric0102/devops-platform-frontend:master
```

구성 항목:

```text
- Service: frontend
- Deployment: frontend
- Port: 80
- Strategy: RollingUpdate
- Replicas: 1
```

Frontend 컨테이너는 Nginx로 React 정적 파일을 제공한다.  
API 요청은 frontend 컨테이너의 Nginx proxy를 통해 Backend Service로 전달된다.

Proxy 경로:

```text
/api/*   → backend:3000/api/*
/health  → backend:3000/health
/ready   → backend:3000/ready
/metrics → backend:3000/metrics
```

## 10. Ingress 구성

Ingress는 외부 HTTP 요청을 frontend Service로 전달한다.

구성 항목:

```text
- Ingress name: devops-platform-ingress
- Ingress class: nginx
- Path: /
- Path type: Prefix
- Backend service: frontend
- Backend service port: 80
```

외부 트래픽 흐름:

```text
localhost:8081
  ↓
ingress-nginx
  ↓
frontend Service:80
```

Backend API 라우팅은 Ingress가 아니라 frontend Nginx proxy에서 처리한다.

## 11. 운영 검증 기준

Kubernetes 배포 후 검증 기준은 리소스 상태, 애플리케이션 응답, 데이터 계층, 배포 제어 동작으로 구분한다.

| 구분 | 검증 항목 |
|---|---|
| 클러스터 | kind 클러스터, ingress-nginx controller, `devops-platform` namespace 상태 |
| 리소스 | frontend, backend, postgres, redis Pod 및 Service 상태 |
| 스토리지 | PostgreSQL PVC 생성 및 데이터 유지 |
| 캐시 | Redis 캐시 생성, 조회, TTL 동작 |
| API | `/health`, `/ready`, `/api/todos`, `/metrics` 응답 |
| 배포 제어 | rollout, rolling restart, scale out / scale in, rollback 동작 |
| Probe | readinessProbe 장애 반영 및 트래픽 제외 동작 |

주요 확인 명령:

```bash
kubectl get pods -n devops-platform
kubectl get svc -n devops-platform
kubectl get ingress -n devops-platform
kubectl get pvc -n devops-platform
kubectl rollout status deployment/backend -n devops-platform
kubectl rollout status deployment/frontend -n devops-platform
curl http://localhost:8081/health
curl http://localhost:8081/ready
curl http://localhost:8081/api/todos
```

## 12. 장애 대응 기록

### 12-1. kind-config.yaml apply 오류

문제:

```text
resource mapping not found for name: "" namespace: "" from "k8s/kind-config.yaml":
no matches for kind "Cluster" in version "kind.x-k8s.io/v1alpha4"
```

원인:

```text
kind-config.yaml은 Kubernetes manifest가 아니라 kind 클러스터 생성용 설정 파일이다.
```

처리 내용:

```text
kind-config.yaml을 k8s/ 디렉터리 밖의 kind/ 디렉터리로 분리했다.
```

현재 구조:

```text
kind/kind-config.yaml
```

### 12-2. namespace NotFound 오류

문제:

```text
Error from server (NotFound): namespaces "devops-platform" not found
```

원인:

```text
namespace 생성 전에 namespace를 참조하는 리소스를 먼저 적용한 상태다.
```

처리 기준:

```text
namespace.yaml
  ↓
configmap.yaml / secret.yaml
  ↓
postgres.yaml / redis.yaml
  ↓
backend.yaml
  ↓
frontend.yaml
  ↓
ingress.yaml
```

### 12-3. exec format error

문제:

```text
exec /docker-entrypoint.sh: exec format error
```

원인:

```text
GitHub Actions 기본 runner는 amd64 환경이고, Oracle Cloud Ampere 서버는 arm64 환경이다.
amd64 전용 Docker image를 arm64 Kubernetes 노드에서 실행하면서 발생한 오류다.
```

처리 내용:

```text
docker-publish.yml에서 Docker Buildx 기반 linux/amd64, linux/arm64 multi-arch image publish를 구성했다.
```

검증 기준:

```text
linux/amd64
linux/arm64
```

## 13. 배포 스크립트

`scripts/` 디렉터리는 Kubernetes 배포, 상태 확인, rollback 절차를 실행하는 스크립트를 포함한다.

```text
scripts
├─ check-k8s.sh
├─ deploy-k8s.sh
├─ rollback-backend.sh
└─ rollback-frontend.sh
```

스크립트 구성:

| 파일 | 역할 |
|---|---|
| `check-k8s.sh` | 11장 검증 기준에 따른 리소스 상태 및 주요 HTTP 엔드포인트 확인 |
| `deploy-k8s.sh` | Kubernetes manifest 적용 및 애플리케이션 rollout 확인 |
| `rollback-backend.sh` | Backend Deployment 이전 revision rollback |
| `rollback-frontend.sh` | Frontend Deployment 이전 revision rollback |

### 13-1. 배포

```bash
./scripts/deploy-k8s.sh
```

처리 순서:

```text
namespace.yaml
  ↓
configmap.yaml / secret.yaml
  ↓
postgres.yaml / redis.yaml
  ↓
PostgreSQL StatefulSet rollout 확인
  ↓
Redis Deployment rollout 확인
  ↓
backend.yaml / frontend.yaml / ingress.yaml
  ↓
Backend, Frontend Deployment rollout 확인
  ↓
/health, /ready 응답 확인
```

### 13-2. 상태 확인

```bash
./scripts/check-k8s.sh
```

`check-k8s.sh`는 배포 후 점검과 CD 완료 검증에서 공통으로 사용한다.

### 13-3. Rollback

```bash
./scripts/rollback-backend.sh
./scripts/rollback-frontend.sh
```

수동 rollback 명령:

```bash
kubectl rollout undo deployment/backend -n devops-platform
kubectl rollout undo deployment/frontend -n devops-platform
```

## 14. CD 자동화

master 브랜치에 변경사항이 병합되면 GitHub Actions에서 Kubernetes 배포 workflow를 실행한다.

전체 흐름:

```text
develop 작업
  ↓
Pull Request 생성
  ↓
CI 검증
  ↓
master 병합
  ↓
Docker Publish
  ↓
GHCR image push
  ↓
Deploy to Kubernetes
  ↓
Oracle Cloud 서버에서 deploy-k8s.sh 실행
  ↓
Kubernetes rollout 확인
```

workflow 실행 순서:

```text
CI
Docker Publish
Deploy to Kubernetes
```

배포 완료 후 `check-k8s.sh`로 11장 검증 기준을 확인한다.

### 14-1. 배포 실패 점검

점검 순서:

```text
- GitHub Actions Deploy to Kubernetes 로그 확인
- SSH 접속 실패 여부 확인
- 서버 kubectl context 확인
- Pod 상태 확인
- Backend, Frontend 로그 확인
- rollout 상태 확인
```

확인 명령:

```bash
kubectl config current-context
kubectl get pods -n devops-platform
kubectl logs -n devops-platform deployment/backend
kubectl logs -n devops-platform deployment/frontend
kubectl rollout status deployment/backend -n devops-platform
kubectl rollout status deployment/frontend -n devops-platform
```

## 15. 완료 기준

다음 조건을 모두 충족하면 Kubernetes 배포 구성을 완료한 상태로 본다.

```text
- k8s manifest가 대상 namespace에 정상 적용됨
- 모든 Pod가 Running 상태로 유지됨
- 11장 운영 검증 기준을 충족함
- deploy-k8s.sh, check-k8s.sh, rollback 스크립트가 정상 동작함
- GitHub Actions 기반 CD 흐름에서 배포와 검증이 재현 가능함
```
