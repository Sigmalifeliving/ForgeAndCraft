import { User, Box, Mic } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { assetService } from '../services/assets';

export default function Profile() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ total: 0, threeD: 0, voice: 0 });

  useEffect(() => {
    let cancelled = false;
    assetService
      .list()
      .then((assets) => {
        if (cancelled) return;
        setCounts({
          total: assets.length,
          threeD: assets.filter((a) => a.type === '3d').length,
          voice: assets.filter((a) => a.type === 'voice').length,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Your account information</p>

      <div className="profile-card card">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <div className="profile-info">
          <h2>{user?.username || 'Guest User'}</h2>
          <p className="text-muted">{user?.email}</p>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <Box size={20} className="gradient-text" />
          <span className="stat-number">{counts.threeD}</span>
          <span className="stat-label">3D Generations</span>
        </div>
        <div className="stat-card">
          <Mic size={20} className="gradient-text" />
          <span className="stat-number">{counts.voice}</span>
          <span className="stat-label">Voice Generations</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{counts.total}</span>
          <span className="stat-label">Total Assets</span>
        </div>
      </div>
    </div>
  );
}