# Security Scan 구성 문서

## 1. 구성 범위

본 문서는 DevOps Platform Portfolio 프로젝트의 보안 스캔 구성을 정리한다.  
범위는 GitHub Actions 기반 의존성 취약점 검사, 파일시스템 검사, Kubernetes manifest 검사, Docker 이미지 검사다.

## 2. Workflow 구성

보안 스캔 workflow는 아래 파일에 정의한다.

```text
.github/workflows/security.yml
```

실행 조건:

| 이벤트 | 대상 |
|---|---|
| Push | `develop`, `master` |
| Pull Request | `master` |

Workflow 권한:

| 권한 | 값 | 용도 |
|---|---|---|
| `contents` | `read` | 저장소 checkout |
| `security-events` | `write` | 보안 이벤트 확장 연동 |

## 3. 스캔 Job 구성

| Job | 도구 | 검사 대상 | 실패 기준 |
|---|---|---|---|
| `npm-audit` | npm audit | Backend, Frontend 의존성 | high 이상 |
| `trivy-filesystem` | Trivy | 저장소 파일시스템 | CRITICAL |
| `trivy-kubernetes-config` | Trivy | `k8s/` manifest | CRITICAL |
| `trivy-image` | Trivy | Backend, Frontend Docker 이미지 | CRITICAL |

`trivy-image` job은 `npm-audit` 완료 후 실행한다.

```text
npm-audit
  ↓
trivy-image
```

## 4. NPM Audit

NPM Audit은 Backend와 Frontend 의존성 취약점을 각각 검사한다.

검사 대상:

| 애플리케이션 | 경로 |
|---|---|
| Backend | `app/backend` |
| Frontend | `app/frontend` |

실행 환경:

| 항목 | 값 |
|---|---|
| Node.js | `22` |
| 설치 명령 | `npm ci` |
| 검사 명령 | `npm audit --audit-level=high` |

로컬 검증:

```bash
cd app/backend
npm ci
npm audit --audit-level=high

cd ../frontend
npm ci
npm audit --audit-level=high
```

## 5. Trivy Filesystem Scan

Trivy Filesystem Scan은 저장소 전체를 대상으로 취약점, secret, misconfiguration을 검사한다.

검사 설정:

| 항목 | 값 |
|---|---|
| `scan-type` | `fs` |
| `scan-ref` | `.` |
| `scanners` | `vuln,secret,misconfig` |
| `severity` | `CRITICAL` |
| `ignore-unfixed` | `true` |
| `exit-code` | `1` |
| `format` | `table` |

실패 조건:

```text
CRITICAL 등급 항목이 발견되면 workflow를 실패 처리한다.
```

## 6. Trivy Kubernetes Config Scan

Trivy Kubernetes Config Scan은 Kubernetes manifest 보안 설정을 검사한다.

검사 대상:

```text
k8s/
```

검사 설정:

| 항목 | 값 |
|---|---|
| `scan-type` | `config` |
| `scan-ref` | `k8s` |
| `severity` | `CRITICAL` |
| `exit-code` | `1` |
| `format` | `table` |

주요 검사 범위:

```text
- 컨테이너 권한 상승 설정
- root user 실행 위험
- resource requests/limits 설정
- Secret 사용 방식
- manifest 보안 설정 누락
```

## 7. Trivy Docker Image Scan

Trivy Docker Image Scan은 CI runner에서 Backend와 Frontend 이미지를 빌드한 뒤 검사한다.

빌드 대상:

| 이미지 | Dockerfile | Context | Tag |
|---|---|---|---|
| Backend | `app/backend/Dockerfile` | `app/backend` | `devops-platform-backend:security` |
| Frontend | `app/frontend/Dockerfile` | `app/frontend` | `devops-platform-frontend:security` |

검사 설정:

| 항목 | 값 |
|---|---|
| `image-ref` | matrix image tag |
| `scanners` | `vuln,secret` |
| `severity` | `CRITICAL` |
| `ignore-unfixed` | `true` |
| `exit-code` | `1` |
| `format` | `table` |

실패 조건:

```text
CRITICAL 등급 취약점 또는 secret 항목이 발견되면 workflow를 실패 처리한다.
```

## 8. 품질 게이트

현재 보안 스캔 품질 게이트는 아래 기준을 사용한다.

| 항목 | 실패 기준 | 비고 |
|---|---|---|
| npm audit | high 이상 | 의존성 취약점 기준 |
| Trivy filesystem | CRITICAL | `ignore-unfixed: true` 적용 |
| Trivy config | CRITICAL | Kubernetes manifest 기준 |
| Trivy image | CRITICAL | `ignore-unfixed: true` 적용 |

CRITICAL 중심으로 실패 기준을 적용하며, 안정화 이후 HIGH 등급까지 확장할 수 있다.

## 9. 실패 대응 기준

### 9-1. NPM Audit 실패

확인 명령:

```bash
npm audit
```

대응 기준:

```text
1. 패치 가능한 dependency 업데이트
2. lockfile 갱신 후 테스트 실행
3. breaking change가 있는 major 업데이트는 영향 범위 검토
```

`npm audit fix --force`는 major version 변경을 포함할 수 있으므로 기본 대응 명령으로 사용하지 않는다.

### 9-2. Trivy Filesystem Scan 실패

대응 기준:

```text
1. secret 탐지 결과 확인
2. repository에 포함된 민감값 제거
3. 취약 dependency 또는 base package 업데이트
4. misconfiguration 항목의 실제 배포 영향 검토
```

### 9-3. Trivy Kubernetes Config Scan 실패

대응 기준:

```text
1. Deployment securityContext 설정 확인
2. 컨테이너 root user 실행 여부 확인
3. resource requests/limits 설정 확인
4. Secret과 ConfigMap 분리 기준 확인
5. 불필요한 권한 또는 capability 제거
```

### 9-4. Trivy Docker Image Scan 실패

대응 기준:

```text
1. base image 업데이트
2. OS package 및 runtime dependency 업데이트
3. 패치 가능한 CRITICAL 취약점 우선 조치
4. 수정 불가 항목은 영향 범위와 수용 여부 검토
```

## 10. 운영 기준

보안 스캔은 CI/CD 배포 전 품질 게이트로 사용한다.  
`develop` 브랜치에서는 변경 사항의 보안 회귀를 조기 확인하고, `master` 브랜치와 pull request에서는 배포 기준의 보안 상태를 검증한다.

스캔 결과는 GitHub Actions job 로그를 기준으로 확인한다.  
실패한 job의 도구 출력에서 대상 파일, package, image layer, manifest 경로를 확인한 뒤 관련 구성 파일을 수정한다.
