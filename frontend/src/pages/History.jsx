import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Box, Mic } from 'lucide-react';
import { jobService } from '../services/jobs';

const statusIcon = {
  completed: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
  failed: <XCircle size={16} style={{ color: 'var(--error)' }} />,
  queued: <Clock size={16} style={{ color: 'var(--text-muted)' }} />,
  processing: <Clock size={16} style={{ color: 'var(--warning)' }} />,
  generating: <Clock size={16} style={{ color: 'var(--warning)' }} />,
  'post-processing': <Clock size={16} style={{ color: 'var(--warning)' }} />,
};

const statusBadge = (status) => {
  const map = {
    completed: 'success',
    failed: 'error',
    queued: 'info',
    processing: 'warning',
    generating: 'warning',
    'post-processing': 'warning',
  };
  return map[status] || 'info';
};

const statusLabel = (status) =>
  status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');

const formatDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function History() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    jobService
      .list()
      .then((data) => {
        if (!cancelled) setJobs(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">Generation History</h1>
      <p className="page-subtitle">Your past generations and their status</p>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading history...</div>
      ) : jobs.length > 0 ? (
        <div className="history-list">
          {jobs.map((item) => (
            <div key={item.id} className={`history-item ${item.status}`}>
              <div className="history-item-icon">
                {item.type === '3d' ? <Box size={18} /> : <Mic size={18} />}
              </div>
              <div className="history-item-info">
                <span className="history-item-name">{item.prompt || 'Untitled'}</span>
                <span className="history-item-meta">
                  {item.type === '3d' ? '3D' : 'Voice'} &middot; {formatDate(item.created_at)}
                  {item.status === 'completed' && item.output_asset_id
                    ? ` · asset #${item.output_asset_id}`
                    : ''}
                </span>
              </div>
              <div className="history-item-status">
                {statusIcon[item.status]}
                <span className={`badge badge-${statusBadge(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No generations yet. Start creating!</p>
        </div>
      )}
    </div>
  );
}