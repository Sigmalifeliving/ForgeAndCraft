// Roblox GUI Component Constants & Conversion Utilities

export const SUPPORTED_ROBLOX_COMPONENTS = [
  'ScreenGui',
  'Frame',
  'ScrollingFrame',
  'ViewportFrame',
  'TextLabel',
  'TextButton',
  'TextBox',
  'ImageLabel',
  'ImageButton',
  'UIListLayout',
  'UIGridLayout',
  'UIPageLayout',
  'UIPadding',
  'UICorner',
  'UIStroke',
  'UIGradient',
  'UIScale',
  'UIAspectRatioConstraint',
];

export const ROBLOX_FONTS = [
  'Gotham',
  'GothamBold',
  'GothamMedium',
  'FredokaOne',
  'SourceSans',
  'SourceSansBold',
  'Ubuntu',
  'SpecialElite',
  'Arcade',
  'Creepster',
];

/**
 * Converts a Roblox UDim2 [scaleX, offsetX, scaleY, offsetY] and AnchorPoint [x, y]
 * into CSS positioning style object for pixel-accurate preview rendering.
 */
export function udim2ToCss(size, position, anchorPoint) {
  const s = size || [1, 0, 1, 0];
  const p = position || [0, 0, 0, 0];
  const a = anchorPoint || [0, 0];

  const scaleX = typeof s[0] === 'number' ? s[0] : 1;
  const offsetX = typeof s[1] === 'number' ? s[1] : 0;
  const scaleY = typeof s[2] === 'number' ? s[2] : 1;
  const offsetY = typeof s[3] === 'number' ? s[3] : 0;

  const posX = typeof p[0] === 'number' ? p[0] : 0;
  const posOffsetX = typeof p[1] === 'number' ? p[1] : 0;
  const posY = typeof p[2] === 'number' ? p[2] : 0;
  const posOffsetY = typeof p[3] === 'number' ? p[3] : 0;

  const anchorX = typeof a[0] === 'number' ? a[0] : 0;
  const anchorY = typeof a[1] === 'number' ? a[1] : 0;

  const widthCalc = scaleX === 0 ? `${offsetX}px` : offsetX === 0 ? `${scaleX * 100}%` : `calc(${scaleX * 100}% + ${offsetX}px)`;
  const heightCalc = scaleY === 0 ? `${offsetY}px` : offsetY === 0 ? `${scaleY * 100}%` : `calc(${scaleY * 100}% + ${offsetY}px)`;

  const leftCalc = posX === 0 ? `${posOffsetX}px` : posOffsetX === 0 ? `${posX * 100}%` : `calc(${posX * 100}% + ${posOffsetX}px)`;
  const topCalc = posY === 0 ? `${posOffsetY}px` : posOffsetY === 0 ? `${posY * 100}%` : `calc(${posY * 100}% + ${posOffsetY}px)`;

  const transform = (anchorX !== 0 || anchorY !== 0) ? `translate(-${anchorX * 100}%, -${anchorY * 100}%)` : undefined;

  return {
    width: widthCalc,
    height: heightCalc,
    left: leftCalc,
    top: topCalc,
    transform,
  };
}

/**
 * Converts Hex string #RRGGBB and transparency into rgba(r, g, b, a) CSS string.
 */
export function colorToCss(hexColor, transparency = 0) {
  if (!hexColor) return 'transparent';
  if (transparency >= 1) return 'transparent';

  let hex = String(hexColor).replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, 1 - transparency));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
