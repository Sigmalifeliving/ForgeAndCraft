import { Box, Mic, Music, AudioLines, Wind, Trash2, Download, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  '3d': Box,
  voice: Mic,
  music: Music,
  sfx: AudioLines,
  ambience: Wind,
};

const TYPE_LABELS = {
  '3d': '3D',
  voice: 'Voice',
  music: 'Music',
  sfx: 'SFX',
  ambience: 'Ambience',
};

export default function AssetCard({ asset, onDelete }) {
  const navigate = useNavigate();
  const key =
    asset.type === '3d' || asset.format === 'glb' || asset.format === 'obj'
      ? '3d'
      : Object.prototype.hasOwnProperty.call(TYPE_ICONS, asset.type)
      ? asset.type
      : 'voice';
  const Icon = TYPE_ICONS[key];

  return (
    <div className="asset-card" onClick={() => navigate(`/assets/${asset.id}`)}>
      <div className="asset-card-preview">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <div className="asset-card-info">
        <h4 className="asset-card-name">{asset.name}</h4>
        <div className="asset-card-meta">
          <span className="badge badge-info">{TYPE_LABELS[key]}</span>
          {asset.duration > 0 && (
            <span className="asset-card-date">{Math.round(asset.duration)}s</span>
          )}
          <span className="asset-card-date">
            <Clock size={12} />
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="asset-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn-icon btn-sm" title="Download">
          <Download size={14} />
        </button>
        <button className="btn-icon btn-sm danger" title="Delete" onClick={() => onDelete?.(asset.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
