# DevOps Platform Portfolio

## 1. 프로젝트 개요

본 저장소는 DevOps 학습 및 운영 환경 구축을 위한 단계형 프로젝트다.  
애플리케이션은 Todo 서비스를 기준으로 구성하며, Docker, CI/CD, Kubernetes, 모니터링, 보안 점검 단계까지 확장 가능한 구조를 대상으로 한다.

현재 범위는 애플리케이션 1차 구조 수립 단계다.

## 2. 현재 구현 범위

```text
Step 1. 애플리케이션 구조 구성
```

포함 항목:

```text
- React + Vite + TypeScript 기반 프론트엔드
- Node.js + Express + TypeScript 기반 백엔드
- PostgreSQL 연동
- Redis 캐시 연동
- Todo CRUD API
- /health, /ready, /metrics 운영용 엔드포인트
- 기본 테스트 및 로컬 실행 환경
```

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Cache | Redis |
| Metrics | prom-client |
| Test | Jest, Supertest |
| Runtime | Oracle Cloud Ubuntu Instance |

## 4. 저장소 구조

```text
devOps-platform
├─ app
│  ├─ frontend
│  │  ├─ src
│  │  ├─ public
│  │  ├─ package.json
│  │  └─ .env.example
│  └─ backend
│     ├─ src
│     │  ├─ config
│     │  ├─ controllers
│     │  ├─ db
│     │  ├─ middlewares
│     │  ├─ repositories
│     │  ├─ routes
│     │  ├─ services
│     │  ├─ types
│     │  ├─ app.ts
│     │  └─ server.ts
│     ├─ migrations
│     ├─ tests
│     ├─ package.json
│     └─ .env.example
├─ docs
│  └─ app-architecture.md
└─ README.md
```

## 5. 실행 방법

### 5-1. Backend

```bash
cd app/backend
npm install
cp .env.example .env
psql -h localhost -U ops_admin -d devops_platform -f migrations/001_create_todos.sql
npm run dev
```

`.env` 예시:

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=devops_platform
DATABASE_USER=ops_admin
DATABASE_PASSWORD=dev1257@@

REDIS_HOST=localhost
REDIS_PORT=6379

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

추가 확인:

```bash
npm run build
npm test
```

### 5-2. Frontend

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

외부 접속이 필요한 경우 아래 옵션을 사용한다.

```bash
npm run dev -- --host 0.0.0.0
```

## 6. 주요 API

### 6-1. Todo API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/todos` | Todo 목록 조회 |
| POST | `/api/todos` | Todo 생성 |
| GET | `/api/todos/:id` | Todo 단건 조회 |
| PATCH | `/api/todos/:id` | Todo 수정 |
| DELETE | `/api/todos/:id` | Todo 삭제 |

### 6-2. 운영용 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/health` | 프로세스 생존 상태 확인 |
| GET | `/ready` | PostgreSQL, Redis 연결 상태 확인 |
| GET | `/metrics` | Prometheus 수집용 메트릭 노출 |

### 6-3. 장애 테스트용 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/error` | 예외 처리 및 장애 대응 테스트 |
| GET | `/api/slow` | 지연 응답 시나리오 테스트 |

## 7. 동작 확인 예시

### 7-1. Health Check

```bash
curl http://localhost:3000/health
```

예상 응답:

```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2026-04-28T00:00:00.000Z"
}
```

### 7-2. Readiness Check

```bash
curl http://localhost:3000/ready
```

예상 응답:

```json
{
  "status": "ready",
  "checks": {
    "postgres": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-04-28T00:00:00.000Z"
}
```

### 7-3. Todo 생성

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Set up TypeScript backend","description":"Express backend with PostgreSQL and Redis"}'
```

### 7-4. Todo 목록 조회

```bash
curl http://localhost:3000/api/todos
```

응답 예시:

```json
{
  "source": "database",
  "data": [
    {
      "id": 1,
      "title": "Set up TypeScript backend",
      "description": "Express backend with PostgreSQL and Redis",
      "completed": false,
      "createdAt": "2026-04-28T06:26:10.067Z",
      "updatedAt": "2026-04-28T06:26:10.067Z"
    }
  ]
}
```

### 7-5. Metrics 확인

```bash
curl -s http://localhost:3000/metrics | head
```

예상 출력:

```text
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 1.530384
```

## 8. 검증 포인트

현재 단계 확인 항목:

```text
- 프론트엔드와 백엔드의 분리 배치
- TypeScript 기반 전체 애플리케이션 구성
- PostgreSQL을 통한 영속 데이터 저장
- Redis를 활용한 목록 조회 캐시 처리
- /health 와 /ready 분리 설계
- /metrics 기반 모니터링 확장 준비
- Docker 및 Kubernetes 단계로의 확장 가능 구조 확보
```

## 9. 관련 문서

- [애플리케이션 구조 문서](docs/app-architecture.md)

## 10. 다음 단계

```text
Step 2. Docker 기반 실행 환경 구성
```

다음 작업 범위:

```text
- Backend Dockerfile 작성
- Frontend Dockerfile 작성
- docker-compose.yml 구성
- PostgreSQL 및 Redis 컨테이너 연동
- Nginx 구성 검토
- 로컬 통합 실행 절차 정리
```
## Docker Compose 실행

Docker Compose 기준 통합 실행 절차를 정리한다.

---

### 1. 환경변수 파일 생성

프로젝트 루트에서 `.env.example`을 복사해 `.env` 파일을 생성한다.

```bash
cp .env.example .env
```

`.env` 예시:

```env
POSTGRES_DB=devops_platform
POSTGRES_USER=devops_user
POSTGRES_PASSWORD=change_me

BACKEND_PORT=3000
FRONTEND_PORT=8080

NODE_ENV=production
LOG_LEVEL=info
```

`.env` 파일은 실제 실행값을 포함하므로 Git에 커밋하지 않는다.

---

### 2. Docker Compose 실행

프로젝트 루트에서 실행한다.

```bash
docker compose up -d --build
```

---

### 3. 컨테이너 상태 확인

```bash
docker compose ps
```

정상 상태에서는 frontend, backend, postgres, redis 컨테이너가 실행 중이어야 한다.

---

### 4. 브라우저 접속

기본 접속 주소:

```text
http://localhost:8080
```

Oracle Cloud 인스턴스에서 외부 접속 시 OCI 보안 규칙에서 8080 포트를 허용해야 한다.

SSH 터널링 사용 시 로컬 PC에서 아래와 같이 접속한다.

```bash
ssh -i ~/.ssh/your-key.pem -L 8080:localhost:8080 ubuntu@SERVER_PUBLIC_IP
```

브라우저 접속 주소:

```text
http://localhost:8080
```

---

### 5. API 확인

Nginx proxy를 통해 backend API를 확인한다.

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/api/todos
curl -s http://localhost:8080/metrics | head
```

---

### 6. 로그 확인

전체 로그:

```bash
docker compose logs
```

Backend 로그:

```bash
docker compose logs -f backend
```

Frontend 로그:

```bash
docker compose logs -f frontend
```

---

### 7. 종료

컨테이너 종료:

```bash
docker compose down
```

이 명령은 컨테이너와 네트워크를 제거하며 volume은 유지한다.

---

### 8. 데이터까지 초기화

PostgreSQL과 Redis volume까지 삭제할 경우 아래 명령을 사용한다.

```bash
docker compose down -v
```

주의: 이 명령은 DB 데이터까지 삭제한다.
