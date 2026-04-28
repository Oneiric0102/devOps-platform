# 애플리케이션 구조 문서

## 1. 문서 개요

이 문서는 DevOps Platform 프로젝트의 1차 애플리케이션 구조를 정리한 중간 산출물이다.  
제출 목적에 맞춰 현재 구현 범위, 구성 요소 역할, 데이터 흐름, 운영 관점의 확장 포인트를 기준으로 정리했다.

## 2. 시스템 구성

```text
React + Vite + TypeScript Frontend
  ↓ HTTP API
Node.js + Express + TypeScript Backend
  ├─ PostgreSQL
  └─ Redis
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

## 4. 디렉터리 구성

```text
devOps-platform
├─ app
│  ├─ frontend
│  └─ backend
├─ docs
└─ README.md
```

## 5. 구성 요소별 역할

### 5-1. Frontend

프론트엔드는 Todo 관리 화면과 기본 상태 표시를 담당한다.

주요 기능:

```text
- Todo 목록 조회
- Todo 생성
- Todo 완료 상태 변경
- Todo 삭제
- 백엔드 health 상태 표시
- 로딩 및 에러 상태 처리
```

### 5-2. Backend

백엔드는 REST API 제공, 데이터 저장, 캐시 처리, 운영용 상태 점검 기능을 담당한다.

주요 기능:

```text
- Todo CRUD API 제공
- PostgreSQL 기반 데이터 저장
- Redis 기반 목록 캐시 처리
- /health, /ready 엔드포인트 제공
- /metrics 엔드포인트 제공
- 장애 테스트용 API 제공
```

## 6. API 구성

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
| GET | `/metrics` | Prometheus 수집용 메트릭 제공 |

### 6-3. 테스트용 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/error` | 예외 처리 경로 검증 |
| GET | `/api/slow` | 지연 응답 상황 검증 |

## 7. 데이터 저장소 설계

### 7-1. PostgreSQL

`todos` 테이블은 Todo 데이터의 영속 저장소 역할을 수행한다.

```sql
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

설계 포인트:

```text
- 서비스 계층과 저장소 계층 분리를 전제로 한 기본 스키마
- 생성일시와 수정일시 컬럼 포함
- 이후 컨테이너 및 오케스트레이션 환경으로 확장 가능한 구조
```

### 7-2. Redis

Redis는 Todo 목록 조회 결과에 대한 캐시 저장소로 사용한다.

처리 흐름:

```text
GET /api/todos 요청
  ↓
Redis 키 todos:all 조회
  ↓
캐시 적중 시 Redis 값 반환
  ↓
캐시 미적중 시 PostgreSQL 조회
  ↓
조회 결과를 Redis에 저장 후 반환
```

캐시 무효화 대상:

```text
POST /api/todos
PATCH /api/todos/:id
DELETE /api/todos/:id
```

## 8. 운영 관점 설계

### 8-1. Health Check

`/health`는 애플리케이션 프로세스의 생존 여부를 확인하기 위한 엔드포인트다.  
향후 컨테이너 환경에서는 liveness probe 용도로 확장할 수 있다.

### 8-2. Readiness Check

`/ready`는 실제 요청 처리 가능 여부를 판단하기 위한 엔드포인트다.

확인 대상:

```text
- PostgreSQL 연결 상태
- Redis 연결 상태
```

향후 배포 환경에서는 readiness probe 및 배포 검증 절차에 활용할 수 있다.

### 8-3. Metrics

`/metrics`는 Prometheus 연동을 위한 기본 관측 지표를 제공한다.

수집 항목:

```text
- Node.js 기본 프로세스 메트릭
- HTTP 요청 처리 시간
- HTTP 상태 코드
- 요청 메서드
- 요청 라우트
```

활용 목적:

```text
- Prometheus 수집 대상 구성
- Grafana 시각화 연계 기반 확보
- 성능 및 장애 분석을 위한 기본 지표 확보
```

## 9. 백엔드 계층 구조

백엔드는 역할 분리를 위해 아래와 같은 계층 구조를 사용한다.

```text
routes
  ↓
controllers
  ↓
services
  ↓
repositories
  ↓
database / cache
```

계층별 책임:

| 계층 | 역할 |
|---|---|
| routes | URL과 컨트롤러 연결 |
| controllers | 요청 파라미터 처리 및 응답 구성 |
| services | 비즈니스 흐름 제어와 캐시 정책 반영 |
| repositories | PostgreSQL 조회 및 저장 처리 |
| db | PostgreSQL, Redis 연결 관리 |
| middlewares | 에러 처리와 메트릭 수집 |

## 10. 본 단계 산출물 기준

현재 단계에서 확인 가능한 범위는 다음과 같다.

```text
- 프론트엔드와 백엔드의 분리 실행
- PostgreSQL 및 Redis 연동
- Todo CRUD 동작
- /health, /ready, /metrics 엔드포인트 제공
- 테스트 코드 기반 기본 검증
- 운영 확장을 고려한 계층 구조 확보
```

## 11. 확장 계획

후속 단계에서는 아래 항목을 순차적으로 반영할 예정이다.

```text
Step 2. Docker 구성
Step 3. 저장소 구조 정리
Step 4. CI 구성
Step 5. 이미지 저장소 연동
Step 6. Kubernetes 배포
Step 7. CD 구성
Step 10. 모니터링 구성
Step 11. 보안 스캔 구성
```
