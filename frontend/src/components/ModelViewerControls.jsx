import { RotateCcw, Grid3x3, Lightbulb, Eye, Maximize2, Minimize2, Play, Pause } from 'lucide-react';

export default function ModelViewerControls({
  wireframe,
  setWireframe,
  grid,
  setGrid,
  lighting,
  setLighting,
  autoRotate = false,
  setAutoRotate = null,
  isFullscreen = false,
  onToggleFullscreen = null,
  onReset,
}) {
  return (
    <div className="viewer-controls">
      {setAutoRotate && (
        <button
          className={`viewer-btn ${autoRotate ? 'active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Pause Turntable' : 'Auto-Rotate Turntable'}
        >
          {autoRotate ? <Pause size={15} /> : <Play size={15} />}
        </button>
      )}

      <button
        className={`viewer-btn ${wireframe ? 'active' : ''}`}
        onClick={() => setWireframe(!wireframe)}
        title="Toggle Wireframe"
      >
        <Eye size={15} />
      </button>

      <button
        className={`viewer-btn ${grid ? 'active' : ''}`}
        onClick={() => setGrid(!grid)}
        title="Toggle Ground Grid"
      >
        <Grid3x3 size={15} />
      </button>

      <button
        className={`viewer-btn ${lighting ? 'active' : ''}`}
        onClick={() => setLighting(!lighting)}
        title="Toggle Studio Lighting"
      >
        <Lightbulb size={15} />
      </button>

      <button className="viewer-btn" onClick={onReset} title="Reset Camera View">
        <RotateCcw size={15} />
      </button>

      {onToggleFullscreen && (
        <button
          className={`viewer-btn ${isFullscreen ? 'active' : ''}`}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      )}
    </div>
  );
}
