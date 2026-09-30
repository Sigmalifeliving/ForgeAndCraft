import React, { useState } from 'react';
import { GuiElementRenderer } from './guiRenderer';
import { Monitor, Smartphone, Tablet, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const VIEWPORTS = [
  { id: 'pc', label: 'PC 1080p', width: 960, height: 540, icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 720, height: 540, icon: Tablet },
  { id: 'mobile', label: 'Mobile Phone', width: 420, height: 540, icon: Smartphone },
];

export default function GuiPreview({ guiSpec, selectedPath, onSelect }) {
  const [viewport, setViewport] = useState('pc');
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const currentVp = VIEWPORTS.find((v) => v.id === viewport) || VIEWPORTS[0];

  return (
    <div className="gui-preview-wrapper">
      {/* Top toolbar: Viewport device & Zoom */}
      <div className="gui-preview-toolbar">
        <div className="gui-viewport-selector">
          {VIEWPORTS.map((vp) => {
            const Icon = vp.icon;
            return (
              <button
                key={vp.id}
                type="button"
                className={`gui-vp-btn ${viewport === vp.id ? 'active' : ''}`}
                onClick={() => setViewport(vp.id)}
                title={vp.label}
              >
                <Icon size={14} />
                <span>{vp.label}</span>
              </button>
            );
          })}
        </div>

        <div className="gui-zoom-controls">
          <button
            type="button"
            className="gui-zoom-btn"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="gui-zoom-val">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="gui-zoom-btn"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="gui-zoom-btn"
            onClick={() => setZoom(1)}
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Roblox Game Viewport Canvas */}
      <div className="gui-canvas-stage">
        <div
          className="gui-mock-roblox-screen"
          style={{
            width: currentVp.width,
            height: currentVp.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Simulated Roblox Topbar */}
          <div className="roblox-simulated-topbar">
            <div className="roblox-simulated-logo">
              <div className="roblox-logo-sq" />
              <span>ForgeCraft Roblox Experience</span>
            </div>
            <div className="roblox-simulated-icons">
              <span>💬</span>
              <span>🎒</span>
              <span>⚙️</span>
            </div>
          </div>

          {/* Render Active ScreenGui Spec */}
          <div className="roblox-gui-content">
            {guiSpec ? (
              <GuiElementRenderer
                element={guiSpec}
                path="0"
                selectedPath={selectedPath}
                onSelect={onSelect}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            ) : (
              <div className="gui-empty-state">
                <p>Generating GUI specification...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
