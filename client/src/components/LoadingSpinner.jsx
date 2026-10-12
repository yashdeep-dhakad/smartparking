export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="center-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}
