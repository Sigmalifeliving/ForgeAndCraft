import React, { useState } from 'react';
import { colorToCss, udim2ToCss } from './guiSchema';

/**
 * Generic Recursive React Renderer for Roblox GUI Specifications.
 * Accurately interprets UDim2 scale + offset, AnchorPoints, UICorner, UIStroke,
 * UIListLayout, and UIGridLayout.
 */
export function GuiElementRenderer({
  element,
  path = '0',
  selectedPath,
  onSelect,
  isInsideGrid = false,
  searchQuery = '',
  onSearchChange,
}) {
  if (!element || typeof element !== 'object') return null;

  const { type = 'Frame', name = 'Element', properties = {}, children = [] } = element;

  // Extract modifiers among immediate children
  const cornerModifier = children.find((c) => c.type === 'UICorner');
  const strokeModifier = children.find((c) => c.type === 'UIStroke');
  const paddingModifier = children.find((c) => c.type === 'UIPadding');
  const listLayout = children.find((c) => c.type === 'UIListLayout');
  const gridLayout = children.find((c) => c.type === 'UIGridLayout');

  // Filter out non-rendered modifier tags from visual children
  const visualChildren = children.filter(
    (c) => !['UICorner', 'UIStroke', 'UIPadding', 'UIListLayout', 'UIGridLayout', 'UIScale', 'UIAspectRatioConstraint'].includes(c.type)
  );

  // Border radius (UICorner)
  let borderRadius = undefined;
  if (cornerModifier && cornerModifier.properties) {
    const cr = cornerModifier.properties.cornerRadius || [0, 8];
    borderRadius = `${cr[1] || 8}px`;
  }

  // Border stroke (UIStroke)
  let border = undefined;
  let boxShadow = undefined;
  if (strokeModifier && strokeModifier.properties) {
    const sc = strokeModifier.properties.strokeColor || '#38bdf8';
    const th = strokeModifier.properties.strokeThickness || 1.5;
    border = `${th}px solid ${colorToCss(sc, 0)}`;
    boxShadow = `0 0 ${th * 4}px ${colorToCss(sc, 0.5)}`;
  }

  // Padding (UIPadding)
  let padding = undefined;
  if (paddingModifier && paddingModifier.properties) {
    const pt = paddingModifier.properties.paddingTop?.[1] || 0;
    const pr = paddingModifier.properties.paddingRight?.[1] || 0;
    const pb = paddingModifier.properties.paddingBottom?.[1] || 0;
    const pl = paddingModifier.properties.paddingLeft?.[1] || 0;
    padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
  }

  // Layout container styling
  let display = 'block';
  let flexDirection = undefined;
  let gap = undefined;
  let gridTemplateColumns = undefined;

  if (listLayout) {
    display = 'flex';
    flexDirection = listLayout.properties?.fillDirection === 'Horizontal' ? 'row' : 'column';
    const pad = listLayout.properties?.padding;
    const padVal = Array.isArray(pad) ? pad[1] : (typeof pad === 'number' ? pad : 8);
    gap = `${padVal || 8}px`;
  } else if (gridLayout) {
    display = 'grid';
    const cs = gridLayout.properties?.cellSize || [0, 160, 0, 195];
    const cp = gridLayout.properties?.cellPadding || [0, 14, 0, 14];
    gridTemplateColumns = `repeat(auto-fill, minmax(${cs[1] || 150}px, 1fr))`;
    gap = `${cp[3] || cp[1] || 12}px ${cp[1] || 12}px`;
  }

  // Coordinate positioning
  const coords = isInsideGrid
    ? { position: 'relative', width: '100%', height: '100%' }
    : {
        position: type === 'ScreenGui' ? 'relative' : 'absolute',
        ...udim2ToCss(properties.size, properties.position, properties.anchorPoint),
      };

  const isSelected = selectedPath === path;

  const baseStyle = {
    ...coords,
    boxSizing: 'border-box',
    backgroundColor: colorToCss(properties.backgroundColor, properties.backgroundTransparency ?? (type === 'ScreenGui' ? 1 : 0)),
    borderRadius,
    border: border || (properties.borderSizePixel ? `${properties.borderSizePixel}px solid #334155` : undefined),
    boxShadow,
    padding,
    display,
    flexDirection,
    gap,
    gridTemplateColumns,
    zIndex: properties.zIndex || 1,
    overflow: type === 'ScrollingFrame' ? 'auto' : 'hidden',
    cursor: ['TextButton', 'ImageButton'].includes(type) ? 'pointer' : 'default',
    outline: isSelected ? '2px solid #00f0ff' : undefined,
    outlineOffset: isSelected ? '1px' : undefined,
    transition: 'all 0.15s ease',
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(path, element);
  };

  // 1. SCREENGUI CONTAINER
  if (type === 'ScreenGui') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          backgroundColor: '#0a0d14',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #161e2e 0%, #0a0d14 100%)',
        }}
        onClick={() => onSelect && onSelect(path, element)}
      >
        {visualChildren.map((child, idx) => (
          <GuiElementRenderer
            key={idx}
            element={child}
            path={`${path}.${idx}`}
            selectedPath={selectedPath}
            onSelect={onSelect}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        ))}
      </div>
    );
  }

  // 2. TEXT BUTTON / INTERACTIVE
  if (type === 'TextButton') {
    const [hovered, setHovered] = useState(false);
    return (
      <button
        style={{
          ...baseStyle,
          color: colorToCss(properties.textColor || '#ffffff'),
          fontSize: `${properties.textSize || 14}px`,
          fontWeight: properties.font?.includes('Bold') ? 700 : 600,
          fontFamily: properties.font ? 'var(--font-heading)' : 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: hovered ? `${baseStyle.transform || ''} scale(1.03)` : baseStyle.transform,
          filter: hovered ? 'brightness(1.15)' : 'none',
        }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {properties.text || 'Button'}
        {visualChildren.map((child, idx) => (
          <GuiElementRenderer
            key={idx}
            element={child}
            path={`${path}.${idx}`}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </button>
    );
  }

  // 3. TEXT LABEL
  if (type === 'TextLabel') {
    return (
      <div
        style={{
          ...baseStyle,
          color: colorToCss(properties.textColor || '#ffffff'),
          fontSize: `${properties.textSize || 14}px`,
          fontWeight: properties.font?.includes('Bold') ? 700 : 500,
          fontFamily: properties.font ? 'var(--font-heading)' : 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: properties.textXAlignment === 'Left' ? 'flex-start' : 'center',
          textAlign: properties.textXAlignment === 'Left' ? 'left' : 'center',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
        onClick={handleClick}
      >
        <span>{properties.text || ''}</span>
        {visualChildren.map((child, idx) => (
          <GuiElementRenderer
            key={idx}
            element={child}
            path={`${path}.${idx}`}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // 4. TEXT BOX (SEARCH BAR / INPUT)
  if (type === 'TextBox') {
    return (
      <div style={baseStyle} onClick={handleClick}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          placeholder={properties.placeholder || properties.text || 'Type here...'}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colorToCss(properties.textColor || '#ffffff'),
            fontSize: `${properties.textSize || 14}px`,
            padding: '0 10px',
            fontFamily: 'inherit',
          }}
        />
        {visualChildren.map((child, idx) => (
          <GuiElementRenderer
            key={idx}
            element={child}
            path={`${path}.${idx}`}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // 5. FRAME & SCROLLING FRAME
  return (
    <div style={baseStyle} onClick={handleClick}>
      {visualChildren.map((child, idx) => {
        // If live search query is active and this is an item card in a grid, filter it
        if (gridLayout && searchQuery) {
          const cardName = String(child.name || '').toLowerCase();
          const cardText = JSON.stringify(child).toLowerCase();
          if (!cardName.includes(searchQuery.toLowerCase()) && !cardText.includes(searchQuery.toLowerCase())) {
            return null;
          }
        }

        return (
          <GuiElementRenderer
            key={idx}
            element={child}
            path={`${path}.${idx}`}
            selectedPath={selectedPath}
            onSelect={onSelect}
            isInsideGrid={!!gridLayout}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        );
      })}
    </div>
  );
}
