# Docker 구성 문서

## 1. 문서 개요

이 문서는 DevOps Platform 프로젝트의 Docker 및 Docker Compose 구성을 정리한다.  
범위는 서비스 구성, 컨테이너 역할, 네트워크, 볼륨, 환경변수, 실행 및 점검 절차다.

## 2. 구성 대상

Docker Compose는 아래 서비스를 단일 애플리케이션 단위로 관리한다.

```text
frontend
backend
postgres
redis
```

## 3. 서비스 구성

| 서비스 | 이미지/빌드 | 역할 | 외부 노출 |
|---|---|---|---|
| frontend | `app/frontend/Dockerfile` | React 빌드 결과물 정적 서빙 및 API reverse proxy | `${FRONTEND_PORT}:80` |
| backend | `app/backend/Dockerfile` | Express API 서버 실행 | 외부 노출 없음 |
| postgres | `postgres:16-alpine` | Todo 데이터 영속 저장 | 외부 노출 없음 |
| redis | `redis:7-alpine` | Todo 목록 캐시 저장 | 외부 노출 없음 |

## 4. 전체 실행 구조

```text
Browser
  ↓
frontend container
  ├─ React 정적 파일 제공
  └─ Nginx reverse proxy
        ↓
     backend container
        ├─ PostgreSQL
        └─ Redis
```

외부 요청 진입점은 frontend 컨테이너 하나로 통합한다.

## 5. Compose 네트워크 구성

모든 서비스는 `devops_network` 브리지 네트워크에 연결된다.

```text
frontend  → backend:3000
backend   → postgres:5432
backend   → redis:6379
```

Docker Compose 내부에서는 서비스 이름이 DNS 이름처럼 동작한다.

백엔드 연결 기준:

```env
DATABASE_HOST=postgres
DATABASE_PORT=5432

REDIS_HOST=redis
REDIS_PORT=6379
```

컨테이너 내부에서 `localhost`는 자기 자신을 의미하므로 데이터 저장소 호스트로 사용하지 않는다.

## 6. Frontend 컨테이너

Frontend는 React + Vite + TypeScript로 구성되며, Docker 이미지 빌드 후 Nginx가 정적 파일을 서빙한다.

빌드 흐름:

```text
1. Node.js 이미지에서 의존성 설치
2. Vite 프로덕션 빌드 수행
3. dist 정적 파일 생성
4. Nginx 이미지로 dist 복사
5. Nginx가 정적 파일 서빙
```

운영 환경에서는 Vite 개발 서버를 사용하지 않는다.

## 7. Nginx Reverse Proxy 구성

Frontend 컨테이너의 Nginx는 정적 파일 서빙과 API 프록시를 함께 처리한다.

경로별 처리 기준:

| 요청 경로 | 처리 방식 |
|---|---|
| `/` | React `index.html` 반환 |
| `/api/*` | `backend:3000/api/*`로 proxy |
| `/health` | `backend:3000/health`로 proxy |
| `/ready` | `backend:3000/ready`로 proxy |
| `/metrics` | `backend:3000/metrics`로 proxy |

이 구성은 backend 포트를 외부에 직접 노출하지 않고 애플리케이션 접근 경로를 단일화한다.

## 8. Backend 컨테이너

Backend는 Node.js + Express + TypeScript로 구성되며 멀티스테이지 빌드를 사용한다.

빌드 및 실행 흐름:

```text
1. builder stage에서 의존성 설치
2. TypeScript 빌드 수행
3. dist 디렉터리 생성
4. runtime stage에서 실행에 필요한 의존성만 포함
5. dist/server.js 실행
```

구성 목적:

```text
- 최종 이미지 크기 축소
- 빌드 도구와 실행 환경 분리
- 빌드 결과물 중심의 실행 환경 구성
```

## 9. PostgreSQL 컨테이너

PostgreSQL은 Todo 데이터의 영속 저장소다.

이미지:

```text
postgres:16-alpine
```

데이터 저장 위치:

```text
postgres_data:/var/lib/postgresql/data
```

초기 스키마는 아래 파일을 컨테이너 초기화 디렉터리에 마운트하여 생성한다.

```text
app/backend/migrations/001_create_todos.sql
  ↓
/docker-entrypoint-initdb.d/001_create_todos.sql
```

초기화 스크립트는 데이터 볼륨이 처음 생성될 때만 실행된다.

## 10. Redis 컨테이너

Redis는 Todo 목록 조회 캐시 저장소다.

이미지:

```text
redis:7-alpine
```

실행 옵션:

```text
redis-server --appendonly yes
```

데이터 저장 위치:

```text
redis_data:/data
```

캐시 처리 흐름:

```text
GET /api/todos 요청
  ↓
Redis에서 todos:all 확인
  ↓
캐시가 있으면 Redis 데이터 반환
  ↓
캐시가 없으면 PostgreSQL 조회
  ↓
조회 결과를 Redis에 저장
```

캐시 삭제 대상:

```text
POST /api/todos
PATCH /api/todos/:id
DELETE /api/todos/:id
  ↓
todos:all 캐시 삭제
```

## 11. 볼륨 구성

Docker Compose는 아래 영속 볼륨을 사용한다.

| 볼륨 | 대상 서비스 | 용도 |
|---|---|---|
| `postgres_data` | postgres | PostgreSQL 데이터 영속화 |
| `redis_data` | redis | Redis appendonly 데이터 저장 |

## 12. 환경변수 구성

Docker Compose 실행용 환경변수는 프로젝트 루트의 `.env` 파일에서 관리한다.

예시 항목:

```env
POSTGRES_DB=devops_platform
POSTGRES_USER=devops_user
POSTGRES_PASSWORD=change_me

BACKEND_PORT=3000
FRONTEND_PORT=8080

NODE_ENV=production
LOG_LEVEL=info
```

주요 적용 대상:

```text
- postgres: 데이터베이스 이름, 계정, 비밀번호
- backend: 실행 환경, 로그 레벨, DB/Redis 연결 정보
- frontend: 외부 노출 포트
```

## 13. 포트 노출 기준

외부에는 frontend 포트만 노출한다.

```text
frontend: ${FRONTEND_PORT} → 80
backend: 외부 포트 노출 없음
postgres: 외부 포트 노출 없음
redis: 외부 포트 노출 없음
```

이 구성은 애플리케이션 진입점을 단일화하고 데이터 저장소의 외부 노출을 제한한다.

## 14. Healthcheck 구성

각 서비스는 아래 기준으로 healthcheck를 수행한다.

| 서비스 | Healthcheck 방식 |
|---|---|
| postgres | `pg_isready` |
| redis | `redis-cli ping` |
| backend | `GET /health` |
| frontend | `GET /` |

`depends_on`은 컨테이너 시작 순서를 제어하고, healthcheck는 실제 서비스 준비 상태를 판단한다.  
backend는 postgres와 redis가 healthy 상태가 된 뒤 시작되며, frontend는 backend가 healthy 상태가 된 뒤 시작된다.

## 15. 실행 및 점검 절차

실행:

```bash
docker compose up -d --build
```

상태 확인:

```bash
docker compose ps
```

로그 확인:

```bash
docker compose logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

기본 점검:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/api/todos
curl -s http://localhost:8080/metrics | head
```

## 16. 초기화 및 재생성 기준

PostgreSQL 초기화 스크립트는 볼륨 최초 생성 시점에만 적용된다.  
데이터 볼륨까지 포함해 전체 구성을 재생성하려면 아래 명령을 사용한다.

```bash
docker compose down -v
docker compose up -d --build
```

`docker compose down -v`는 PostgreSQL 및 Redis 데이터 볼륨을 함께 삭제한다.

## 17. GitHub Actions 기반 이미지 배포

GitHub Actions 기준 Docker 이미지 배포 구성을 정리한다.

---

### 1. 워크플로 구성

워크플로 파일:

```text
.github/workflows/ci.yml
.github/workflows/docker-publish.yml
```

역할:

| 워크플로 | 역할 |
|---|---|
| `ci.yml` | 코드, 테스트, Docker 빌드, Compose 구성 검증 |
| `docker-publish.yml` | master 브랜치 기준 Docker 이미지 배포 |

---

### 2. CI 실행 조건

실행 조건:

```text
- develop 브랜치 push
- master 브랜치 push
- master 브랜치 대상 pull request
```

검증 항목:

```text
- Backend 빌드
- Backend 테스트
- Frontend 빌드
- Backend Docker 이미지 빌드
- Frontend Docker 이미지 빌드
- Docker Compose 구성
```

CI 단계에서는 Docker 이미지를 레지스트리에 push하지 않는다.

---

### 3. Docker 이미지 배포 조건

실행 조건:

```text
- master 브랜치 push
```

develop 브랜치에서는 CI 검증만 수행한다.

---

### 4. GHCR 이미지 이름

Docker 이미지는 GitHub Container Registry에 배포한다.

이미지 이름:

```text
ghcr.io/OWNER/REPOSITORY-backend
ghcr.io/OWNER/REPOSITORY-frontend
```

예시:

```text
ghcr.io/your-username/devops-platform-backend
ghcr.io/your-username/devops-platform-frontend
```

---

### 5. 이미지 태그

사용 태그:

| 태그 | 의미 |
|---|---|
| `master` | master 브랜치 기준 최신 이미지 |
| `sha-xxxxxxx` | 특정 commit 기준 이미지 |

예시:

```text
ghcr.io/your-username/devops-platform-backend:master
ghcr.io/your-username/devops-platform-backend:sha-a1b2c3d

ghcr.io/your-username/devops-platform-frontend:master
ghcr.io/your-username/devops-platform-frontend:sha-a1b2c3d
```

---

### 6. 워크플로 권한

GHCR 이미지 push 권한:

```yaml
permissions:
  contents: read
  packages: write
```

---

### 7. 브랜치 운영 흐름

운영 흐름:

```text
develop 브랜치 작업
  ↓
CI 실행
  ↓
develop → master Pull Request
  ↓
CI 실행
  ↓
master merge
  ↓
Docker 이미지 배포
  ↓
GHCR 이미지 생성
```
