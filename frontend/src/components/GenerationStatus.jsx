import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

const statusConfig = {
  queued: { icon: Clock, color: 'var(--text-muted)', label: 'Queued' },
  processing: { icon: Loader2, color: 'var(--warning)', label: 'Processing' },
  generating: { icon: Loader2, color: 'var(--warning)', label: 'Generating' },
  'post-processing': { icon: Loader2, color: 'var(--warning)', label: 'Post-Processing' },
  completed: { icon: CheckCircle, color: 'var(--success)', label: 'Completed' },
  failed: { icon: XCircle, color: 'var(--error)', label: 'Failed' },
};

export default function GenerationStatus({ status, progress, message }) {
  const config = statusConfig[status] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <div className="generation-status">
      <div className="generation-status-header">
        <Icon
          size={20}
          style={{ color: config.color }}
          className={status === 'processing' || status === 'generating' ? 'spin' : ''}
        />
        <span style={{ color: config.color }}>{config.label}</span>
      </div>
      {message && <p className="generation-status-message">{message}</p>}
      {(status === 'processing' || status === 'generating' || status === 'post-processing') && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress || 0}%` }} />
        </div>
      )}
    </div>
  );
}
