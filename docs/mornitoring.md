# Monitoring 구성

## 1. 구성 개요

본 문서는 Kubernetes 환경에서 Backend 메트릭을 수집하고 시각화하기 위한 모니터링 구성을 정리한다.

모니터링 범위는 Backend의 `/metrics` 엔드포인트, Prometheus 수집 설정, Grafana datasource 구성, 기본 PromQL 검증까지 포함한다.

## 2. 구현 범위

```text
Step 1. Backend /metrics 엔드포인트 노출
Step 2. Prometheus scrape target 구성
Step 3. Grafana Prometheus datasource 구성
Step 4. PromQL 기반 수집 상태 검증
```

포함 항목:

```text
- prom-client 기반 Node.js 기본 메트릭 수집
- http_request_duration_seconds 히스토그램 수집
- Prometheus ConfigMap 기반 scrape 설정
- Prometheus TSDB PVC 구성
- Grafana datasource provisioning 구성
- Grafana PVC 구성
- port-forward 기반 로컬 접근
```

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Metrics Export | prom-client |
| Metrics Store | Prometheus |
| Visualization | Grafana |
| Runtime | Kubernetes |
| Storage | PersistentVolumeClaim |
| Access | kubectl port-forward |

## 4. 파일 구조

```text
k8s
└─ monitoring
   ├─ prometheus.yaml
   └─ grafana.yaml
```

| 파일 | 설명 |
|---|---|
| `k8s/monitoring/prometheus.yaml` | Prometheus Service, PVC, ConfigMap, Deployment 구성 |
| `k8s/monitoring/grafana.yaml` | Grafana Service, PVC, datasource ConfigMap, Deployment 구성 |

## 5. 전체 구조

```text
Backend Pod
  ↓
/metrics
  ↓
Backend Service
  ↓
Prometheus scrape
  ↓
Prometheus TSDB
  ↓
Grafana datasource
  ↓
Dashboard / Explore
```

Backend는 `prom-client`를 통해 프로세스 기본 메트릭과 HTTP 요청 지연 시간 메트릭을 노출한다.  
Prometheus는 Backend Service DNS를 대상으로 `/metrics`를 수집한다.  
Grafana는 Prometheus를 datasource로 등록하고 PromQL 기반 조회와 대시보드 구성을 담당한다.

## 6. Backend 메트릭

Backend 메트릭 엔드포인트:

```text
GET /metrics
```

주요 애플리케이션 메트릭:

| 메트릭 | 설명 |
|---|---|
| `http_request_duration_seconds_count` | HTTP 요청 누적 수 |
| `http_request_duration_seconds_sum` | HTTP 요청 처리 시간 누적 합 |
| `http_request_duration_seconds_bucket` | HTTP 요청 처리 시간 히스토그램 bucket |

주요 label:

| Label | 설명 |
|---|---|
| `method` | HTTP method |
| `route` | Express route 또는 요청 path |
| `status_code` | HTTP 응답 상태 코드 |

Backend 컨테이너 내부 확인:

```bash
kubectl exec -n devops-platform deploy/backend -- \
  wget -qO- http://localhost:3000/metrics
```

## 7. Prometheus 구성

Prometheus 구성 리소스:

| 리소스 | 이름 |
|---|---|
| Service | `prometheus` |
| Deployment | `prometheus` |
| ConfigMap | `prometheus-config` |
| PVC | `prometheus-pvc` |

Prometheus 설정:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - localhost:9090

  - job_name: backend
    metrics_path: /metrics
    static_configs:
      - targets:
          - backend.devops-platform.svc.cluster.local:3000
```

보관 기간:

```text
7d
```

Prometheus는 `backend.devops-platform.svc.cluster.local:3000` 주소로 Backend Service에 접근한다.

## 8. Grafana 구성

Grafana 구성 리소스:

| 리소스 | 이름 |
|---|---|
| Service | `grafana` |
| Deployment | `grafana` |
| ConfigMap | `grafana-datasource` |
| PVC | `grafana-pvc` |

Datasource 설정:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus.devops-platform.svc.cluster.local:9090
    isDefault: true
    editable: true
```

초기 계정:

```text
admin / admin
```

운영 환경에서는 Grafana 초기 비밀번호를 Secret으로 분리하고 기본 비밀번호를 변경한다.

## 9. 배포

모니터링 리소스 배포:

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

rollout 확인:

```bash
kubectl rollout status deployment/prometheus -n devops-platform
kubectl rollout status deployment/grafana -n devops-platform
```

리소스 확인:

```bash
kubectl get pods -n devops-platform
kubectl get svc -n devops-platform
kubectl get pvc -n devops-platform
```

정상 기준:

```text
prometheus Deployment AVAILABLE 1
grafana Deployment AVAILABLE 1
prometheus-pvc Bound
grafana-pvc Bound
```

## 10. Prometheus 접속

port-forward 실행:

```bash
kubectl port-forward -n devops-platform svc/prometheus 9090:9090
```

접속 주소:

```text
http://localhost:9090
```

Targets 화면:

```text
http://localhost:9090/targets
```

정상 기준:

```text
prometheus UP
backend UP
```

## 11. Grafana 접속

port-forward 실행:

```bash
kubectl port-forward -n devops-platform svc/grafana 3001:3000
```

접속 주소:

```text
http://localhost:3001
```

Datasource 확인 경로:

```text
Connections > Data sources > Prometheus
```

Grafana Explore에서 PromQL을 실행해 Prometheus 연동 상태를 확인한다.

## 12. 기본 PromQL

Backend target 상태:

```promql
up{job="backend"}
```

전체 target 상태:

```promql
up
```

Backend 요청 처리율:

```promql
sum(rate(http_request_duration_seconds_count{job="backend"}[1m]))
```

상태 코드별 요청 처리율:

```promql
sum by (status_code) (
  rate(http_request_duration_seconds_count{job="backend"}[1m])
)
```

p95 응답 시간:

```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{job="backend"}[5m])
  )
)
```

route별 p95 응답 시간:

```promql
histogram_quantile(
  0.95,
  sum by (route, le) (
    rate(http_request_duration_seconds_bucket{job="backend"}[5m])
  )
)
```

## 13. 테스트 트래픽 생성

Backend API port-forward 실행:

```bash
kubectl port-forward -n devops-platform svc/backend 8081:3000
```

요청 생성:

```bash
for i in {1..20}; do
  curl -s http://localhost:8081/health > /dev/null
  curl -s http://localhost:8081/api/todos > /dev/null
done
```

지연 응답 메트릭 생성:

```bash
curl -s http://localhost:8081/api/slow
```

오류 응답 메트릭 생성:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/api/error
```

## 14. Dashboard 패널

| 패널 | PromQL |
|---|---|
| Backend UP | `up{job="backend"}` |
| Target UP | `up` |
| Request Rate | `sum(rate(http_request_duration_seconds_count{job="backend"}[1m]))` |
| Status Code Rate | `sum by (status_code) (rate(http_request_duration_seconds_count{job="backend"}[1m]))` |
| p95 Response Time | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="backend"}[5m])))` |
| Route p95 Response Time | `histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket{job="backend"}[5m])))` |

## 15. 장애 확인

### 15-1. Prometheus target DOWN

Service와 Endpoint 확인:

```bash
kubectl get svc backend -n devops-platform
kubectl get endpoints backend -n devops-platform
```

Prometheus 로그 확인:

```bash
kubectl logs -n devops-platform deployment/prometheus
```

Backend `/metrics` 확인:

```bash
kubectl exec -n devops-platform deploy/backend -- \
  wget -qO- http://localhost:3000/metrics
```

확인 항목:

```text
- backend Service selector와 Pod label 일치 여부
- backend Pod readiness 상태
- /metrics 응답 상태
- Prometheus scrape target DNS 오타 여부
```

### 15-2. Grafana datasource 연결 실패

Grafana 로그 확인:

```bash
kubectl logs -n devops-platform deployment/grafana
```

Prometheus Service 확인:

```bash
kubectl get svc prometheus -n devops-platform
kubectl get endpoints prometheus -n devops-platform
```

Grafana Pod 내부에서 Prometheus 접근 확인:

```bash
kubectl exec -n devops-platform deploy/grafana -- \
  wget -qO- http://prometheus.devops-platform.svc.cluster.local:9090/-/ready
```

확인 항목:

```text
- prometheus Service DNS 접근 가능 여부
- grafana-datasource ConfigMap mount 여부
- datasource URL 값
- Prometheus Pod readiness 상태
```

### 15-3. PVC Pending

PVC 상태 확인:

```bash
kubectl get pvc -n devops-platform
kubectl describe pvc prometheus-pvc -n devops-platform
kubectl describe pvc grafana-pvc -n devops-platform
```

확인 항목:

```text
- kind 클러스터 StorageClass 존재 여부
- PVC accessModes 지원 여부
- 노드 디스크 용량
```

## 16. 검증 명령

YAML 문법 확인:

```bash
kubectl apply --dry-run=client -f k8s/monitoring/prometheus.yaml
kubectl apply --dry-run=client -f k8s/monitoring/grafana.yaml
```

Backend 메트릭 라우트 테스트:

```bash
cd app/backend
npm test
```

모니터링 동작 확인:

```bash
kubectl rollout status deployment/prometheus -n devops-platform
kubectl rollout status deployment/grafana -n devops-platform
kubectl port-forward -n devops-platform svc/prometheus 9090:9090
```

Prometheus에서 다음 쿼리 결과가 `1`이면 Backend scrape가 정상이다.

```promql
up{job="backend"}
```
