# DevOps Platform Portfolio

## 1. 프로젝트 개요

본 저장소는 DevOps 학습 및 운영 환경 구축을 위한 단계형 프로젝트다.  
Todo 애플리케이션을 기준으로 애플리케이션 구조, Docker 실행 환경, CI/CD, Kubernetes 배포 구성을 순차적으로 확장한다.

현재 범위는 Docker Compose 기반 통합 실행과 kind 기반 Kubernetes 배포 구성까지 포함한다.

## 2. 구현 범위

```text
Step 1. 애플리케이션 구조 구성
Step 2. Docker 기반 실행 환경 구성
Step 3. CI/CD 및 Docker 이미지 배포 구성
Step 4. Kubernetes 배포 구성
```

포함 항목:

```text
- React + Vite + TypeScript 기반 프론트엔드
- Node.js + Express + TypeScript 기반 백엔드
- PostgreSQL 기반 Todo 데이터 저장
- Redis 기반 Todo 목록 캐시
- Todo CRUD API
- /health, /ready, /metrics 운영용 엔드포인트
- Docker Compose 기반 통합 실행 환경
- GitHub Actions 기반 CI 및 Docker 이미지 배포
- kind 기반 Kubernetes 배포 구성
```

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, TypeScript, Nginx |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Cache | Redis |
| Metrics | prom-client |
| Test | Jest, Supertest |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions, GitHub Container Registry |
| Kubernetes | kind, ingress-nginx |
| Runtime | Oracle Cloud Ubuntu Instance |

## 4. 저장소 구조

```text
devOps-platform
├─ .github
│  └─ workflows
│     ├─ ci.yml
│     └─ docker-publish.yml
├─ app
│  ├─ frontend
│  │  ├─ src
│  │  ├─ public
│  │  ├─ Dockerfile
│  │  ├─ nginx.conf
│  │  ├─ package.json
│  │  └─ .env.example
│  └─ backend
│     ├─ src
│     ├─ migrations
│     ├─ tests
│     ├─ Dockerfile
│     ├─ package.json
│     └─ .env.example
├─ docs
│  ├─ app-architecture.md
│  ├─ docker.md
│  └─ kubernetes.md
├─ k8s
│  ├─ namespace.yaml
│  ├─ configmap.yaml
│  ├─ secret.yaml
│  ├─ postgres.yaml
│  ├─ redis.yaml
│  ├─ backend.yaml
│  ├─ frontend.yaml
│  └─ ingress.yaml
├─ kind
│  └─ kind-config.yaml
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

## 5. 애플리케이션 구성

```text
Client
  ↓
Frontend
  ↓
Backend API
  ↓
PostgreSQL / Redis
```

Frontend는 Todo 관리 화면과 운영 상태 표시를 담당한다.  
Backend는 Todo API, 캐시 처리, 상태 점검, 메트릭 노출을 담당한다.  
PostgreSQL은 Todo 데이터를 저장하며, Redis는 Todo 목록 조회 캐시로 사용한다.

## 6. 로컬 개발 실행

### 6-1. Backend

```bash
cd app/backend
npm install
cp .env.example .env
psql -h localhost -U devops_user -d devops_platform -f migrations/001_create_todos.sql
npm run dev
```

`.env` 예시:

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=devops_platform
DATABASE_USER=devops_user
DATABASE_PASSWORD=change_me

REDIS_HOST=localhost
REDIS_PORT=6379

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

Backend 로컬 실행은 PostgreSQL과 Redis 연결을 전제로 한다.

검증 명령:

```bash
npm run build
npm test
```

### 6-2. Frontend

```bash
cd app/frontend
npm install
cp .env.example .env
npm run dev
```

`.env` 예시:

```env
VITE_API_BASE_URL=http://localhost:3000
```

외부 접속 옵션:

```bash
npm run dev -- --host 0.0.0.0
```

## 7. Docker Compose 실행

프로젝트 루트의 `.env.example`을 기준으로 `.env` 파일을 구성한다.

```bash
cp .env.example .env
docker compose up -d --build
```

기본 접속 주소:

```text
http://localhost:8080
```

상태 확인:

```bash
docker compose ps
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/api/todos
curl -s http://localhost:8080/metrics | head
```

구성 상세는 [Docker 구성 문서](docs/docker.md)에 정리한다.

## 8. 주요 API

### 8-1. Todo API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/todos` | Todo 목록 조회 |
| POST | `/api/todos` | Todo 생성 |
| GET | `/api/todos/:id` | Todo 단건 조회 |
| PATCH | `/api/todos/:id` | Todo 수정 |
| DELETE | `/api/todos/:id` | Todo 삭제 |

### 8-2. 운영용 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/health` | 프로세스 생존 상태 확인 |
| GET | `/ready` | PostgreSQL, Redis 연결 상태 확인 |
| GET | `/metrics` | Prometheus 수집용 메트릭 노출 |

### 8-3. 장애 검증용 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/error` | 예외 처리 경로 검증 |
| GET | `/api/slow` | 지연 응답 경로 검증 |

## 9. CI/CD 및 Docker 이미지 배포

GitHub Actions는 CI 검증과 Docker 이미지 배포를 분리한다.

| 워크플로 | 실행 조건 | 역할 |
|---|---|---|
| `.github/workflows/ci.yml` | `develop`, `master` push / `master` pull request | Backend, Frontend, Docker, Compose 검증 |
| `.github/workflows/docker-publish.yml` | `master` push | GHCR multi-arch Docker 이미지 배포 |

배포 이미지:

```text
ghcr.io/oneiric0102/devops-platform-backend:master
ghcr.io/oneiric0102/devops-platform-backend:sha-xxxxxxx

ghcr.io/oneiric0102/devops-platform-frontend:master
ghcr.io/oneiric0102/devops-platform-frontend:sha-xxxxxxx
```

브랜치 운영 기준:

| 브랜치 | 역할 |
|---|---|
| `develop` | 개발 및 CI 검증용 브랜치 |
| `master` | 안정 브랜치 및 이미지 배포 기준 브랜치 |

## 10. Kubernetes 배포 구성

Kubernetes 단계는 Docker Compose 기반 통합 실행 구성을 클러스터 배포 형태로 확장한 범위다.  
로컬 검증 환경은 kind를 기준으로 하며, 애플리케이션 실행에 필요한 frontend, backend, PostgreSQL, Redis 리소스를 Kubernetes manifest로 분리한다.

관련 파일:

```text
kind/kind-config.yaml
k8s/
```

리소스 구성:

| 파일 | 역할 |
|---|---|
| `namespace.yaml` | 프로젝트 리소스 격리를 위한 namespace 정의 |
| `configmap.yaml` | 애플리케이션 런타임 설정값 정의 |
| `secret.yaml` | 데이터베이스 접속 정보 등 민감값 정의 |
| `postgres.yaml` | PostgreSQL StatefulSet, Service, PVC 구성 |
| `redis.yaml` | Redis Deployment 및 Service 구성 |
| `backend.yaml` | Backend Deployment 및 Service 구성 |
| `frontend.yaml` | Frontend Deployment 및 Service 구성 |
| `ingress.yaml` | 외부 요청을 frontend와 backend로 라우팅하는 Ingress 구성 |

Kubernetes 구성 상세는 [Kubernetes 배포 문서](docs/kubernetes.md)에 정리한다.

## 11. 검증 포인트

```text
- 프론트엔드와 백엔드의 분리 배치
- TypeScript 기반 전체 애플리케이션 구성
- PostgreSQL을 통한 영속 데이터 저장
- Redis를 활용한 목록 조회 캐시 처리
- /health 와 /ready 분리 설계
- /metrics 기반 모니터링 확장 준비
- Docker Compose 기반 통합 실행
- GitHub Actions 기반 CI/CD 구성
- Kubernetes 기반 배포 및 운영 검증 구조
```

## 12. 관련 문서

- [애플리케이션 구조 문서](docs/app-architecture.md)
- [Docker 구성 문서](docs/docker.md)
- [Kubernetes 배포 문서](docs/kubernetes.md)

## 13. 다음 단계

```text
Step 5. 모니터링 및 관측성 구성
```

다음 작업 범위:

```text
- Prometheus 수집 구성
- Grafana 대시보드 구성
- 애플리케이션 메트릭 시각화
- Kubernetes 리소스 상태 모니터링
- 장애 탐지 및 알림 기준 정리
```

## 14. 모니터링 구성

모니터링 단계는 Backend의 `/metrics` 엔드포인트를 Prometheus 수집 대상으로 등록하고, Grafana에서 Prometheus datasource를 통해 애플리케이션 메트릭을 시각화하는 범위다.

구성 요소:

```text
Backend /metrics
  ↓
Prometheus
  ↓
Grafana
```

관련 파일:

| 파일 | 역할 |
|---|---|
| `k8s/monitoring/prometheus.yaml` | Prometheus Deployment, Service, ConfigMap, PVC 구성 |
| `k8s/monitoring/grafana.yaml` | Grafana Deployment, Service, datasource ConfigMap, PVC 구성 |

배포:

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

상태 확인:

```bash
kubectl rollout status deployment/prometheus -n devops-platform
kubectl rollout status deployment/grafana -n devops-platform
```

Prometheus 접속:

```bash
kubectl port-forward -n devops-platform svc/prometheus 9090:9090
```

접속:

```text
http://localhost:9090
```

Grafana 접속:

```bash
kubectl port-forward -n devops-platform svc/grafana 3001:3000
```

접속:

```text
http://localhost:3001
```

초기 계정:

```text
admin / admin
```

모니터링 구성 상세는 [Monitoring 구성 문서](docs/mornitoring.md)에 정리한다.

## 15. 보안 스캔 구성

보안 스캔 단계는 GitHub Actions에서 의존성, 파일시스템, Kubernetes manifest, Docker 이미지 보안 검사를 자동화한 범위다.

관련 파일:

```text
.github/workflows/security.yml
```

실행 조건:

| 조건 | 대상 |
|---|---|
| Push | `develop`, `master` |
| Pull Request | `master` |

검사 구성:

| Job | 도구 | 검사 대상 |
|---|---|---|
| NPM Audit | npm audit | Backend, Frontend 의존성 |
| Trivy Filesystem Scan | Trivy | 저장소 파일시스템, secret, misconfiguration |
| Trivy Kubernetes Config Scan | Trivy | `k8s/` Kubernetes manifest |
| Trivy Docker Image Scan | Trivy | Backend, Frontend Docker 이미지 |

품질 게이트:

| 항목 | 실패 기준 |
|---|---|
| npm audit | high 이상 |
| Trivy filesystem | CRITICAL |
| Trivy config | CRITICAL |
| Trivy image | CRITICAL |

로컬 검증:

```bash
cd app/backend
npm audit --audit-level=high

cd ../frontend
npm audit --audit-level=high
```

스캔 대상 이미지:

```text
devops-platform-backend:security
devops-platform-frontend:security
```

보안 스캔 구성 상세는 [Security Scan 구성 문서](docs/security.md)에 정리한다.
