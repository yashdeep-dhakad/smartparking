import { AlertTriangle } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}
