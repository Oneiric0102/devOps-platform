# Incident Response 문서

## 1. 대응 범위

본 문서는 DevOps Platform Portfolio 프로젝트의 알림 및 장애 대응 구성을 정리한다.  
GitHub Actions 기반 배포, 보안 스캔, Kubernetes 운영 확인 과정에서 실패가 발생했을 때의 확인 절차와 rollback 경로를 포함한다.

포함 항목:

```text
- GitHub Actions 결과 Slack 알림
- Deploy to Kubernetes 성공 및 실패 알림
- Security workflow 실패 알림
- Oracle Cloud kind 클러스터 상태 확인
- Kubernetes Deployment rollout 상태 확인
- Backend, Frontend 로그 확인
- Backend, Frontend rollback 절차
- npm audit 및 Trivy 실패 대응 기준
- Prometheus, Grafana 상태 확인 경로
```

## 2. 운영 환경

| 항목 | 값 |
|---|---|
| CI/CD | GitHub Actions |
| 알림 채널 | Slack Incoming Webhook |
| 배포 대상 | Oracle Cloud Ubuntu Instance |
| Kubernetes 환경 | kind |
| Namespace | `devops-platform` |
| 외부 접근 포트 | `8081` |

## 3. 관련 Workflow

| Workflow | 파일 | 역할 |
|---|---|---|
| Deploy to Kubernetes | `.github/workflows/deploy-k8s.yml` | GHCR 이미지 배포 완료 후 Kubernetes 배포 실행 |
| Security | `.github/workflows/security.yml` | 의존성, 파일시스템, Kubernetes manifest, Docker 이미지 보안 검사 |

알림 대상:

| Workflow | 조건 | 알림 |
|---|---|---|
| `Deploy to Kubernetes` | 배포 성공 | Kubernetes 배포 성공 알림 |
| `Deploy to Kubernetes` | 배포 실패 | Kubernetes 배포 실패 알림 |
| `Security` | 보안 스캔 실패 | Security workflow 실패 알림 |

## 4. Secret 구성

GitHub Actions에서 사용하는 Secret은 GitHub repository settings에서 관리한다.

| Secret | 용도 |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL |
| `OCI_HOST` | Oracle Cloud 서버 주소 |
| `OCI_USER` | Oracle Cloud SSH 사용자 |
| `OCI_SSH_KEY` | Oracle Cloud SSH private key |
| `OCI_PROJECT_PATH` | 서버 내 프로젝트 경로 |

Secret 관리 기준:

```text
- Secret 값은 repository에 커밋하지 않는다.
- README, docs, issue, commit message에 Secret 원문을 기록하지 않는다.
- Webhook URL 유출 시 Slack App에서 기존 Webhook을 폐기하고 새로 발급한다.
- SSH key 유출 시 서버 authorized_keys와 GitHub Secrets를 함께 교체한다.
```

## 5. 알림 흐름

```text
GitHub Actions
  ↓
Workflow 결과 판정
  ↓
Slack Incoming Webhook
  ↓
운영자 확인 및 조치
```

배포 성공 알림은 배포 스크립트와 상태 확인 스크립트가 모두 완료된 경우 전송한다.  
배포 실패 알림은 SSH 접속, 서버 배포 스크립트, Kubernetes rollout, smoke test 중 하나라도 실패한 경우 전송한다.  
보안 실패 알림은 Security workflow의 검사 job 중 하나라도 실패한 경우 전송한다.

## 6. 배포 실패 대응

배포 실패 알림 수신 시 GitHub Actions 로그를 먼저 확인한다.

```text
GitHub
  ↓
Actions
  ↓
Deploy to Kubernetes
  ↓
실패한 workflow run
```

서버 접속 이후 Kubernetes 상태를 확인한다.

```bash
kubectl get pods -n devops-platform
kubectl get svc -n devops-platform
kubectl get ingress -n devops-platform
kubectl get events -n devops-platform --sort-by=.lastTimestamp
```

Backend 로그:

```bash
kubectl logs -n devops-platform deployment/backend
```

Frontend 로그:

```bash
kubectl logs -n devops-platform deployment/frontend
```

Rollout 상태:

```bash
kubectl rollout status deployment/backend -n devops-platform
kubectl rollout status deployment/frontend -n devops-platform
```

운영 엔드포인트 확인:

```bash
curl http://localhost:8081/health
curl http://localhost:8081/ready
curl http://localhost:8081/api/todos
```

## 7. 배포 실패 원인 분류

| 증상 | 가능 원인 | 확인 방법 |
|---|---|---|
| SSH 접속 실패 | SSH key, host, user 설정 오류 | GitHub Secrets, Actions SSH 로그 확인 |
| git pull 실패 | 서버 repository 권한 또는 branch 상태 오류 | 서버에서 `git fetch origin master`, `git status` 확인 |
| kubectl 실패 | kind cluster 중지 또는 context 오류 | `kubectl config current-context`, `kubectl get nodes` 확인 |
| ImagePullBackOff | 이미지 태그 또는 registry 인증 오류 | `kubectl describe pod`, GHCR 이미지 태그 확인 |
| CrashLoopBackOff | 애플리케이션 실행 오류 또는 환경변수 누락 | `kubectl logs`, ConfigMap, Secret 확인 |
| rollout timeout | readiness probe 실패 또는 Pod 재시작 반복 | `kubectl rollout status`, `kubectl describe pod` 확인 |
| smoke test 실패 | Backend readiness 또는 API 응답 실패 | `/health`, `/ready`, `/api/todos` 확인 |

## 8. Rollback 절차

Rollback은 Kubernetes Deployment의 이전 revision으로 되돌리는 절차다.

Backend rollback:

```bash
./scripts/rollback-backend.sh
```

Frontend rollback:

```bash
./scripts/rollback-frontend.sh
```

수동 rollback:

```bash
kubectl rollout undo deployment/backend -n devops-platform
kubectl rollout undo deployment/frontend -n devops-platform
```

Rollback 후 상태 확인:

```bash
kubectl rollout status deployment/backend -n devops-platform
kubectl rollout status deployment/frontend -n devops-platform
curl http://localhost:8081/health
curl http://localhost:8081/ready
curl http://localhost:8081/api/todos
```

Revision 확인:

```bash
kubectl rollout history deployment/backend -n devops-platform
kubectl rollout history deployment/frontend -n devops-platform
```

## 9. Security workflow 실패 대응

Security workflow 실패 알림 수신 시 GitHub Actions에서 실패 job을 확인한다.

```text
GitHub
  ↓
Actions
  ↓
Security
  ↓
실패한 workflow run
```

검사 대상:

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

## 10. npm audit 대응

Backend 확인:

```bash
cd app/backend
npm audit --audit-level=high
```

Frontend 확인:

```bash
cd app/frontend
npm audit --audit-level=high
```

수정 기준:

```text
1. 취약 패키지와 영향 범위를 확인한다.
2. fixed version이 있는 경우 package.json과 package-lock.json을 함께 갱신한다.
3. major version 변경이 필요한 경우 build와 test를 함께 검증한다.
4. npm audit fix --force는 breaking change 가능성을 검토한 뒤 별도 변경으로 적용한다.
```

## 11. Trivy 대응

Trivy 실패 시 Actions 로그에서 취약점 ID, severity, package, installed version, fixed version을 확인한다.

대응 기준:

```text
1. CRITICAL 항목을 우선 처리한다.
2. fixed version 제공 여부를 확인한다.
3. base image 또는 dependency를 업데이트한다.
4. Kubernetes manifest misconfiguration은 k8s/ 리소스 기준으로 수정한다.
5. 실제 영향이 없는 항목은 근거를 남긴 뒤 .trivyignore 적용 여부를 검토한다.
```

Kubernetes manifest 확인 항목:

```text
- resource requests/limits
- securityContext
- runAsNonRoot
- allowPrivilegeEscalation
- Secret 사용 방식
- image tag 고정 여부
```

Security context 예시:

```yaml
securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
```

`readOnlyRootFilesystem`은 Nginx, Prometheus, Grafana처럼 쓰기 경로가 필요한 컨테이너에서 바로 적용하면 기동 실패가 발생할 수 있다. 적용 전 writable volume 또는 임시 디렉터리 구성을 함께 검토한다.

## 12. 모니터링 확인

Kubernetes 리소스 상태 확인:

```bash
./scripts/check-k8s.sh
```

Prometheus target 확인:

```bash
kubectl port-forward -n devops-platform svc/prometheus 9090:9090
```

접속:

```text
http://localhost:9090/targets
```

Grafana 확인:

```bash
kubectl port-forward -n devops-platform svc/grafana 3001:3000
```

접속:

```text
http://localhost:3001
```

## 13. 관련 문서

- [README](../README.md)
- [Kubernetes 배포 문서](kubernetes.md)
- [Security Scan 구성 문서](security.md)
