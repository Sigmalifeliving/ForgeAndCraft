import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Trash2, Box, Mic, Music, AudioLines, Wind, X } from 'lucide-react';
import ModelViewer from '../components/ModelViewer';
import ModelViewerControls from '../components/ModelViewerControls';
import AudioPlayer from '../components/AudioPlayer';
import { assetService } from '../services/assets';

const TYPE_LABELS = {
  '3d': '3D Model',
  voice: 'Voice',
  music: 'Music',
  sfx: 'Sound Effect',
  ambience: 'Ambience',
};

const TYPE_ICONS = {
  '3d': Box,
  voice: Mic,
  music: Music,
  sfx: AudioLines,
  ambience: Wind,
};

export default function AssetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [threeDUrl, setThreeDUrl] = useState(null);
  const [wireframe, setWireframe] = useState(false);
  const [grid, setGrid] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [modelStats, setModelStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    assetService
      .get(id)
      .then((data) => {
        if (!cancelled) {
          setAsset(data);
          setNewName(data.name);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Handle ESC key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Download media blob
  useEffect(() => {
    if (!asset || !asset.file_path) return;
    let cancelled = false;
    assetService
      .download(asset.id)
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        if (asset.type === '3d') {
          setThreeDUrl(objectUrl);
        } else {
          setAudioUrl(objectUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (threeDUrl) URL.revokeObjectURL(threeDUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [asset]);

  if (error) {
    return (
      <div className="page-container">
        <Link to="/assets" className="back-link">
          <ArrowLeft size={16} /> My Assets
        </Link>
        <div className="empty-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return <div className="page-container empty-state">Loading...</div>;
  }

  const is3D = asset.type === '3d';
  const DetailIcon = TYPE_ICONS[asset.type] || Mic;

  const handleRename = async () => {
    try {
      const updated = await assetService.rename(asset.id, newName.trim() || asset.name);
      setAsset(updated);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    try {
      await assetService.remove(asset.id);
      navigate('/assets');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page-container">
      <Link to="/assets" className="back-link">
        <ArrowLeft size={16} />
        My Assets
      </Link>

      {is3D ? (
        <div className={`asset-detail-3d ${isFullscreen ? 'viewer-fullscreen-active' : ''}`}>
          <div className="preview-header">
            <div className="preview-title-area">
              <h3>{isFullscreen ? `Full Screen Preview — ${asset.name}` : '3D Model View'}</h3>
              {modelStats && (
                <div className="model-stats-chips">
                  <span className="stat-chip">{modelStats.faces.toLocaleString()} tris</span>
                  <span className="stat-chip">{modelStats.vertices.toLocaleString()} verts</span>
                </div>
              )}
            </div>
            <div className="preview-header-actions">
              <ModelViewerControls
                wireframe={wireframe}
                setWireframe={setWireframe}
                grid={grid}
                setGrid={setGrid}
                lighting={lighting}
                setLighting={setLighting}
                autoRotate={autoRotate}
                setAutoRotate={setAutoRotate}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                onReset={() => setResetSignal((c) => c + 1)}
              />
              {isFullscreen && (
                <button
                  type="button"
                  className="viewer-btn exit-fullscreen-btn"
                  onClick={() => setIsFullscreen(false)}
                  title="Close Fullscreen (Esc)"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          <div className={`viewer-wrapper viewer-large ${isFullscreen ? 'viewer-wrapper-fullscreen' : ''}`}>
            <Suspense fallback={<div className="viewer-loading">Loading 3D Viewer...</div>}>
              <ModelViewer
                url={threeDUrl}
                wireframe={wireframe}
                grid={grid}
                lighting={lighting}
                autoRotate={autoRotate}
                resetSignal={resetSignal}
                onStats={setModelStats}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="asset-detail-audio">
          <AudioPlayer src={audioUrl} title={asset.name} />
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}

      <div className="asset-detail-info">
        <div className="asset-detail-header">
          <div className="asset-detail-icon">
            <DetailIcon size={24} />
          </div>
          <div>
            {editing ? (
              <div className="rename-row">
                <input
                  className="input-field"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={handleRename}>
                  Save
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <h2 className="asset-detail-name">{asset.name}</h2>
            )}
            <div className="asset-detail-meta">
              <span>Type: {TYPE_LABELS[asset.type] || asset.type}</span>
              <span>Format: {asset.format?.toUpperCase()}</span>
              {asset.duration > 0 && <span>Duration: {asset.duration.toFixed(1)}s</span>}
              {asset.model && <span>Engine: {asset.model}</span>}
              <span>Created: {new Date(asset.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="asset-detail-actions">
          {is3D && threeDUrl && (
            <a href={threeDUrl} download={`${asset.name}.${asset.format || 'glb'}`} className="btn btn-primary">
              <Download size={16} />
              Download {asset.format?.toUpperCase() || 'GLB'}
            </a>
          )}
          {!is3D && audioUrl && (
            <a href={audioUrl} download={`${asset.name}.wav`} className="btn btn-primary">
              <Download size={16} />
              Download Audio
            </a>
          )}
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Rename
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>

        {asset.prompt && (
          <div className="asset-prompt">
            <p>
              <strong>Generation prompt:</strong>
            </p>
            <p>{asset.prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}