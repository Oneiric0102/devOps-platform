# CI/CD 구성 문서

## 1. 구성 범위

GitHub Actions에서 실행되는 CI/CD 흐름을 정리한다.  
CI 검증, 보안 스캔, Docker 이미지 배포, Kubernetes 배포 자동화, Slack 알림을 기준으로 구성했다.

## 2. Workflow 구성

| Workflow | 파일 | 실행 조건 | 역할 |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | `develop`, `master` push / `master` pull request | Backend, Frontend, Docker, Compose 검증 |
| Security | `.github/workflows/security.yml` | `develop`, `master` push / `master` pull request | 의존성, 파일시스템, Kubernetes manifest, Docker 이미지 보안 검사 |
| Docker Publish | `.github/workflows/docker-publish.yml` | `master` push | Backend, Frontend Docker 이미지 GHCR 배포 |
| Deploy to Kubernetes | `.github/workflows/deploy-k8s.yml` | Docker Publish 성공 | Oracle Cloud kind 클러스터 배포 |

## 3. 전체 흐름

```text
develop 브랜치 작업
  ↓
CI / Security 검증
  ↓
develop → master Pull Request
  ↓
CI / Security 검증
  ↓
master 병합
  ↓
Docker Publish
  ↓
Deploy to Kubernetes
  ↓
Slack 알림
```

## 4. CI 검증

CI workflow는 애플리케이션 빌드, 테스트, 컨테이너 빌드, Compose 구성을 검증한다.

검증 항목:

```text
- Backend dependency install
- Backend TypeScript build
- Backend test
- Frontend dependency install
- Frontend lint
- Frontend production build
- Backend Docker image build
- Frontend Docker image build
- Docker Compose config validation
```

CI 단계에서는 Docker 이미지를 레지스트리에 push하지 않는다.

## 5. Security 검증

Security workflow는 배포 전 보안 품질 게이트로 사용한다.

검사 항목:

| Job | 도구 | 검사 대상 |
|---|---|---|
| `npm-audit` | npm audit | Backend, Frontend 의존성 |
| `trivy-filesystem` | Trivy | 저장소 파일시스템, secret, misconfiguration |
| `trivy-kubernetes-config` | Trivy | `k8s/` Kubernetes manifest |
| `trivy-image` | Trivy | Backend, Frontend Docker 이미지 |

세부 기준은 [Security Scan 구성 문서](security.md)에 정리한다.

## 6. Docker 이미지 배포

Docker Publish workflow는 `master` 브랜치 push 시 GHCR에 이미지를 배포한다.

배포 이미지:

```text
ghcr.io/oneiric0102/devops-platform-backend
ghcr.io/oneiric0102/devops-platform-frontend
```

사용 태그:

| 태그 | 의미 |
|---|---|
| `master` | master 브랜치 기준 최신 이미지 |
| `sha-xxxxxxx` | 특정 commit 기준 이미지 |

지원 플랫폼:

```text
linux/amd64
linux/arm64
```

Oracle Cloud Ampere A1 환경의 arm64 아키텍처를 고려해 Docker Buildx 기반 multi-arch build를 사용한다.

## 7. Kubernetes 배포 자동화

Deploy to Kubernetes workflow는 Docker Publish workflow가 성공한 뒤 `workflow_run`으로 실행된다.

배포 흐름:

```text
GitHub Actions
  ↓
SSH to Oracle Cloud server
  ↓
git fetch / checkout / pull master
  ↓
scripts/deploy-k8s.sh
  ↓
scripts/check-k8s.sh
  ↓
Slack 알림
```

`deploy-k8s.sh`는 Kubernetes manifest 적용과 rollout 확인을 담당한다.  
`check-k8s.sh`는 배포 완료 후 주요 리소스와 HTTP 엔드포인트 상태를 확인한다.

## 8. Secret 구성

| Secret | 용도 |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL |
| `OCI_HOST` | Oracle Cloud 서버 주소 |
| `OCI_USER` | Oracle Cloud SSH 사용자 |
| `OCI_SSH_KEY` | Oracle Cloud SSH private key |
| `OCI_PROJECT_PATH` | 서버 내 프로젝트 경로 |

Secret 값은 repository에 커밋하지 않는다.

## 9. 실패 대응 기준

CI 실패:

```text
- 실패 job 로그 확인
- Backend test 또는 Frontend build 실패 원인 확인
- Dockerfile 및 docker-compose.yml 구성 확인
```

Security 실패:

```text
- 실패한 security job 확인
- npm audit 또는 Trivy 결과 확인
- 취약 dependency, secret, manifest misconfiguration 조치
```

Deploy 실패:

```text
- GitHub Actions Deploy to Kubernetes 로그 확인
- SSH 접속 및 서버 repository 상태 확인
- Kubernetes Pod, Service, Ingress 상태 확인
- 필요 시 rollback 스크립트 실행
```

배포 실패 대응 절차는 [Incident Response 문서](incident-response.md)에 정리한다.
