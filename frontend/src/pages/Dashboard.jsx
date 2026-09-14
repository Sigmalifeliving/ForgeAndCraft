import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Mic, Plus, FolderOpen, Clapperboard, Music } from 'lucide-react';
import { assetService } from '../services/assets';
import { jobService } from '../services/jobs';

const quickActions = [
  { icon: Box, label: 'Generate 3D', to: '/create/3d', color: '#6c5ce7' },
  { icon: Mic, label: 'Generate Voice', to: '/create/voice', color: '#00d2a0' },
];

const typeIcon = {
  '3d': Box,
  voice: Mic,
  image: FolderOpen,
  music: Music,
};

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([assetService.list(), jobService.list()]).then(([a, j]) => {
      if (cancelled) return;
      if (a.status === 'fulfilled') setAssets(a.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = assets.slice(0, 3);
  const hasData = loaded && (assets.length > 0 || jobs.length > 0);

  return (
    <div className="page-container">
      <h1 className="page-title">Welcome back</h1>
      <p className="page-subtitle">What do you want to create?</p>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-number">{assets.length}</span>
          <span className="stat-label">Total Assets</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{assets.filter((a) => a.type === '3d').length}</span>
          <span className="stat-label">3D Models</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{assets.filter((a) => a.type === 'voice').length}</span>
          <span className="stat-label">Voice Clips</span>
        </div>
      </div>

      <h2 className="section-title">Quick Create</h2>
      <div className="quick-actions">
        {quickActions.map((action) => (
          <Link key={action.label} to={action.to} className="quick-action-card">
            <div className="quick-action-icon" style={{ background: `${action.color}20`, color: action.color }}>
              <action.icon size={24} />
            </div>
            <span>{action.label}</span>
            <Plus size={16} className="quick-action-plus" />
          </Link>
        ))}
      </div>

      <h2 className="section-title">
        <Clapperboard size={18} className="section-title-icon" />
        Recent Creations
      </h2>
      {recent.length > 0 ? (
        <div className="recent-grid">
          {recent.map((asset) => {
            const Icon = typeIcon[asset.type] || Box;
            return (
              <Link key={asset.id} to={`/assets/${asset.id}`} className="recent-card">
                <div className="recent-card-icon">
                  <Icon size={24} />
                </div>
                <div className="recent-card-info">
                  <span className="recent-card-name">{asset.name}</span>
                  <span className="badge badge-info">{asset.format.toUpperCase()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {hasData
              ? 'No saved assets yet. Generate your first one!'
              : `Something went wrong loading assets. Make sure the backend is running and you're signed in.`}
          </p>
        </div>
      )}
    </div>
  );
}