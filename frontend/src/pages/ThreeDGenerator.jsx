import { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Download,
  Box,
  Sparkles,
  Gamepad2,
  Maximize2,
  X,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ModelViewer from '../components/ModelViewer';
import ModelViewerControls from '../components/ModelViewerControls';
import GenerationStatus from '../components/GenerationStatus';
import { threeDService } from '../services/threeD';
import { api } from '../services/api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STYLE_OPTIONS = [
  {
    id: 'roblox',
    name: 'Roblox Low-Poly',
    badge: 'Recommended',
    desc: 'Clean beveled edges, solid vibrant colors, Roblox Studio ready',
    icon: '🎮',
  },
  {
    id: 'cartoon',
    name: 'Stylized Cartoon',
    badge: 'Popular',
    desc: 'Smooth curved shapes, Pixar aesthetic, saturated tones',
    icon: '🎨',
  },
  {
    id: 'chibi',
    name: 'Chibi Cute',
    badge: '',
    desc: 'Cute miniature toy proportions, rounded kawaii charm',
    icon: '🧸',
  },
  {
    id: 'rpg_prop',
    name: 'RPG Fantasy Prop',
    badge: '',
    desc: 'Hand-painted look for swords, shields, potions, chests',
    icon: '🗡️',
  },
  {
    id: 'voxel',
    name: 'Voxel Blocky',
    badge: '',
    desc: 'Cube-grid voxel aesthetic with retro charm',
    icon: '🧊',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Stylized',
    badge: '',
    desc: 'Clean futuristic bevels, neon cyber highlights',
    icon: '🤖',
  },
];

const PROMPT_SUGGESTIONS = [
  'Roblox diamond sword with glowing rune',
  'Cute cartoon green slime pet with eyes',
  'Medieval wooden treasure chest with gold trim',
  'Stylized sci-fi laser blaster gun',
  'Cartoon magical health potion bottle',
  'Low-poly pine tree with cartoon snow',
  'Roblox astronaut jetpack with dual thrusters',
  'Cute cartoon wizard hat with golden stars',
];

export default function ThreeDGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('roblox');
  const [quality, setQuality] = useState('fast');
  const [format, setFormat] = useState('glb');
  const [referenceImage, setReferenceImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState('');
  const [wireframe, setWireframe] = useState(false);
  const [grid, setGrid] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [modelStats, setModelStats] = useState(null);

  const fileInputRef = useRef(null);
  const abortRef = useRef(false);
  const urlRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  // Fullscreen toggle handler (ESC key listener + body overflow handling)
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

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenStatus('queued');
    setProgress(0);
    setResult(null);
    setModelUrl(null);
    setModelStats(null);
    setError('');
    abortRef.current = false;

    try {
      const job = await threeDService.generate({
        prompt: prompt.trim(),
        style,
        quality,
        format,
        reference_image: referenceImage || '',
      });
      setGenStatus(job.status);
      setProgress(job.progress);

      while (!abortRef.current) {
        await sleep(700);
        const check = await threeDService.getJob(job.id);
        setGenStatus(check.status);
        setProgress(check.progress);
        if (check.status === 'completed') {
          if (check.output_asset_id) {
            const blob = await api.getBlob(`/assets/${check.output_asset_id}/download`);
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = URL.createObjectURL(blob);
            setModelUrl(urlRef.current);
          }
          setResult({ id: check.output_asset_id, name: prompt.trim() });
          break;
        }
        if (check.status === 'failed') {
          setError(`Generation failed. ${check.message || 'Please try again.'}`);
          break;
        }
      }
    } catch (e) {
      setError(e.message || 'Could not reach the backend.');
    } finally {
      setGenerating(false);
      abortRef.current = false;
    }
  };

  return (
    <div className="page-container">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="title-row">
        <div>
          <h1 className="page-title">3D Game Model Generator</h1>
          <p className="page-subtitle">
            Generate cartoonish, low-poly, and stylized 3D assets optimized for Roblox & games
          </p>
        </div>
      </div>

      <div className="generator-layout">
        <div className="generator-sidebar">
          {/* Prompt input */}
          <div className="input-group">
            <div className="input-label-row">
              <label>Describe your game asset</label>
            </div>
            <textarea
              className="input-field"
              placeholder="e.g. cute cartoon dragon pet with small horns..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
              rows={3}
            />
          </div>

          {/* Quick inspiration tags */}
          <div className="inspiration-tags">
            <div className="tag-label">
              <Sparkles size={13} />
              <span>Ideas:</span>
            </div>
            <div className="tag-list">
              {PROMPT_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tag-chip"
                  onClick={() => setPrompt(tag)}
                  disabled={generating}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="input-group">
            <label className="section-label">
              <Gamepad2 size={15} />
              Game Style
            </label>
            <div className="style-grid">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`style-card ${style === opt.id ? 'active' : ''}`}
                  onClick={() => setStyle(opt.id)}
                  disabled={generating}
                >
                  <div className="style-card-header">
                    <span className="style-icon">{opt.icon}</span>
                    <span className="style-name">{opt.name}</span>
                    {opt.badge && <span className="style-badge">{opt.badge}</span>}
                  </div>
                  <div className="style-desc">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference image upload */}
          <div className="input-group">
            <label>Reference Image (optional)</label>
            <div
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {referenceImage ? (
                <div className="upload-preview-wrapper">
                  <img src={referenceImage} alt="Reference" className="upload-preview" />
                  <button
                    type="button"
                    className="upload-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReferenceImage(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Upload concept sketch or reference</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
          </div>

          {/* Quality selection */}
          <div className="input-group">
            <label>Quality & Speed</label>
            <div className="radio-group">
              {[
                { id: 'fast', label: 'Fast (Low-Poly)', desc: 'Smooth, rapid ~5s' },
                { id: 'balanced', label: 'Balanced', desc: 'Standard ~8s' },
                { id: 'quality', label: 'Quality', desc: 'Detailed mesh' },
              ].map((q) => (
                <label key={q.id} className={`radio-option ${quality === q.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="quality"
                    value={q.id}
                    checked={quality === q.id}
                    onChange={(e) => setQuality(e.target.value)}
                    disabled={generating}
                  />
                  <span>{q.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format selection */}
          <div className="input-group">
            <label>Export Format</label>
            <select
              className="input-field"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={generating}
            >
              <option value="glb">GLB (Roblox / Web Standard)</option>
              <option value="obj">OBJ (Wavefront Mesh)</option>
            </select>
          </div>

          <button
            className="btn btn-primary btn-lg full-width"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            <Box size={18} />
            {generating ? 'Forging 3D Model...' : 'Generate 3D Asset'}
          </button>

          {error && <div className="auth-error">{error}</div>}

          {genStatus && (
            <GenerationStatus status={genStatus} progress={progress} />
          )}
        </div>

        {/* 3D Preview Card */}
        <div
          ref={previewRef}
          className={`generator-preview ${isFullscreen ? 'viewer-fullscreen-active' : ''}`}
        >
          <div className="preview-header">
            <div className="preview-title-area">
              <h3>{isFullscreen ? `Full Screen Preview — ${result?.name || '3D Asset'}` : '3D Preview'}</h3>
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
                onToggleFullscreen={toggleFullscreen}
                onReset={() => setResetSignal((c) => c + 1)}
              />

              {isFullscreen && (
                <button
                  type="button"
                  className="viewer-btn exit-fullscreen-btn"
                  onClick={toggleFullscreen}
                  title="Close Fullscreen (Esc)"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className={`viewer-wrapper ${isFullscreen ? 'viewer-wrapper-fullscreen' : ''}`}>
            <Suspense fallback={<div className="viewer-loading">Loading 3D Canvas...</div>}>
              <ModelViewer
                url={modelUrl}
                wireframe={wireframe}
                grid={grid}
                lighting={lighting}
                autoRotate={autoRotate}
                resetSignal={resetSignal}
                onStats={setModelStats}
              />
            </Suspense>

            {/* Quick helper badge */}
            {!modelUrl && !generating && (
              <div className="preview-placeholder-hint">
                <p>Interactive 3D Stage</p>
                <span>Rotate, zoom, and test your model before exporting</span>
              </div>
            )}
          </div>

          {result && (
            <div className="download-bar">
              <div className="download-info">
                <span className="download-label">Asset Ready!</span>
                <span className="download-sub">{result.name}</span>
              </div>
              <div className="download-actions">
                {modelUrl && (
                  <a
                    href={modelUrl}
                    download={`${result.name || 'model'}.${format}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Download size={14} />
                    Download {format.toUpperCase()}
                  </a>
                )}
                <Link to={`/assets/${result.id}`} className="btn btn-primary btn-sm">
                  View Asset Details
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
