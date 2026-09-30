import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layout,
  Square,
  Type,
  MousePointerClick,
  TextCursor,
  Image,
  Scroll,
  Sparkles,
  Layers,
} from 'lucide-react';

function getIconForType(type) {
  switch (type) {
    case 'ScreenGui':
      return <Layers size={13} color="#38bdf8" />;
    case 'Frame':
      return <Square size={13} color="#818cf8" />;
    case 'ScrollingFrame':
      return <Scroll size={13} color="#a78bfa" />;
    case 'TextLabel':
      return <Type size={13} color="#34d399" />;
    case 'TextButton':
      return <MousePointerClick size={13} color="#f59e0b" />;
    case 'TextBox':
      return <TextCursor size={13} color="#ec4899" />;
    case 'ImageLabel':
    case 'ImageButton':
      return <Image size={13} color="#fb7185" />;
    case 'UICorner':
    case 'UIStroke':
    case 'UIGradient':
      return <Sparkles size={13} color="#e879f9" />;
    default:
      return <Layout size={13} color="#94a3b8" />;
  }
}

function TreeNode({ element, path = '0', selectedPath, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);
  const children = element.children || [];
  const hasChildren = children.length > 0;
  const isSelected = selectedPath === path;

  return (
    <div style={{ marginLeft: path === '0' ? 0 : 12 }}>
      <div
        className={`gui-tree-node ${isSelected ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(path, element);
        }}
      >
        {hasChildren ? (
          <span
            className="gui-tree-chevron"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        ) : (
          <span style={{ width: 12, display: 'inline-block' }} />
        )}

        {getIconForType(element.type)}
        <span className="gui-tree-name">{element.name || element.type}</span>
        <span className="gui-tree-type">{element.type}</span>
      </div>

      {!collapsed && hasChildren && (
        <div className="gui-tree-children">
          {children.map((child, idx) => (
            <TreeNode
              key={idx}
              element={child}
              path={`${path}.${idx}`}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuiTree({ guiSpec, selectedPath, onSelect }) {
  if (!guiSpec) return <div className="gui-tree-empty">No GUI loaded</div>;

  return (
    <div className="gui-tree-container">
      <div className="gui-tree-header">
        <span>Roblox Explorer Hierarchy</span>
      </div>
      <div className="gui-tree-body">
        <TreeNode
          element={guiSpec}
          path="0"
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
