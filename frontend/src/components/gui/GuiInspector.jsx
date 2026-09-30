import React from 'react';
import { Sliders, CheckCircle2 } from 'lucide-react';

export default function GuiInspector({ selectedElement, onPropertyChange }) {
  if (!selectedElement) {
    return (
      <div className="gui-inspector-empty">
        <Sliders size={20} strokeWidth={1.5} color="var(--text-secondary)" />
        <p>Select any element in the preview or tree to inspect its Roblox properties.</p>
      </div>
    );
  }

  const { type, name, properties = {} } = selectedElement;

  return (
    <div className="gui-inspector-container">
      <div className="gui-inspector-header">
        <div>
          <h4>{name}</h4>
          <span className="gui-inspector-badge">{type}</span>
        </div>
      </div>

      <div className="gui-inspector-body">
        {/* Basic Meta */}
        <div className="gui-prop-group">
          <label>Instance Name</label>
          <input
            type="text"
            className="input-field input-sm"
            value={name}
            onChange={(e) => onPropertyChange && onPropertyChange('name', e.target.value)}
          />
        </div>

        {/* Text property if present */}
        {'text' in properties && (
          <div className="gui-prop-group">
            <label>Text</label>
            <input
              type="text"
              className="input-field input-sm"
              value={properties.text || ''}
              onChange={(e) => onPropertyChange && onPropertyChange('properties.text', e.target.value)}
            />
          </div>
        )}

        {/* Background Color */}
        {'backgroundColor' in properties && (
          <div className="gui-prop-group">
            <label>BackgroundColor3</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={properties.backgroundColor?.startsWith('#') ? properties.backgroundColor : '#161b22'}
                onChange={(e) => onPropertyChange && onPropertyChange('properties.backgroundColor', e.target.value)}
                style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
              />
              <input
                type="text"
                className="input-field input-sm"
                value={properties.backgroundColor || ''}
                onChange={(e) => onPropertyChange && onPropertyChange('properties.backgroundColor', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Text Color */}
        {'textColor' in properties && (
          <div className="gui-prop-group">
            <label>TextColor3</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={properties.textColor?.startsWith('#') ? properties.textColor : '#ffffff'}
                onChange={(e) => onPropertyChange && onPropertyChange('properties.textColor', e.target.value)}
                style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
              />
              <input
                type="text"
                className="input-field input-sm"
                value={properties.textColor || ''}
                onChange={(e) => onPropertyChange && onPropertyChange('properties.textColor', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Size UDim2 */}
        {'size' in properties && (
          <div className="gui-prop-group">
            <label>Size (UDim2 [ScaleX, OffsetX, ScaleY, OffsetY])</label>
            <div className="gui-udim-grid">
              <span>{properties.size?.[0] ?? 0}</span>
              <span>{properties.size?.[1] ?? 0}px</span>
              <span>{properties.size?.[2] ?? 0}</span>
              <span>{properties.size?.[3] ?? 0}px</span>
            </div>
          </div>
        )}

        {/* Position UDim2 */}
        {'position' in properties && (
          <div className="gui-prop-group">
            <label>Position (UDim2)</label>
            <div className="gui-udim-grid">
              <span>{properties.position?.[0] ?? 0}</span>
              <span>{properties.position?.[1] ?? 0}px</span>
              <span>{properties.position?.[2] ?? 0}</span>
              <span>{properties.position?.[3] ?? 0}px</span>
            </div>
          </div>
        )}

        {/* AnchorPoint */}
        {'anchorPoint' in properties && (
          <div className="gui-prop-group">
            <label>AnchorPoint (Vector2 [X, Y])</label>
            <div className="gui-udim-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <span>{properties.anchorPoint?.[0] ?? 0}</span>
              <span>{properties.anchorPoint?.[1] ?? 0}</span>
            </div>
          </div>
        )}

        {/* Background Transparency */}
        {'backgroundTransparency' in properties && (
          <div className="gui-prop-group">
            <label>BackgroundTransparency: {properties.backgroundTransparency}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={properties.backgroundTransparency ?? 0}
              onChange={(e) => onPropertyChange && onPropertyChange('properties.backgroundTransparency', parseFloat(e.target.value))}
              className="range-slider"
            />
          </div>
        )}
      </div>
    </div>
  );
}
