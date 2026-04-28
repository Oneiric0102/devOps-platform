type HealthStatusProps = {
  status: string;
};

export function HealthStatus({ status }: HealthStatusProps) {
  const normalizedStatus = status.toLowerCase();
  const isHealthy = normalizedStatus === 'ok';

  return (
    <div
      className={`status-pill ${
        isHealthy ? 'status-pill--ok' : 'status-pill--warn'
      }`}
    >
      <span className="status-pill__dot" />
      <div className="status-pill__content">
        <span className="status-pill__label">Backend</span>
        <strong>{status}</strong>
      </div>
    </div>
  );
}