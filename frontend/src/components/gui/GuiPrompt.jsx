import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Send,
  Loader2,
  Undo2,
  Redo2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

const QUICK_PROMPTS = [
  {
    label: 'Futuristic Weapon Shop',
    prompt:
      'Create a futuristic weapon shop with 6 weapons, a search bar, item prices, purchase buttons and a dark neon theme.',
    theme: 'modern',
  },
  {
    label: 'Player Inventory (16 Slots)',
    prompt:
      'Player inventory frame with 16 item slots, title bar, slot borders, and a red close button.',
    theme: 'modern',
  },
  {
    label: 'Combat Player HUD',
    prompt:
      'Clean combat HUD with red Health bar (HP 850/1000), blue Shield bar, and level currency badge.',
    theme: 'tactical',
  },
  {
    label: 'Simulator Pet Store',
    prompt:
      'Pet shop with 4 colorful pet cards, rarity badges, coin prices, and a bright cartoon simulator theme.',
    theme: 'cartoon',
  },
];

const QUICK_MODIFICATIONS = [
  'Make the buttons blue',
  'Add a search bar at the top',
  'Change the theme to dark neon',
  'Add a close button in top right',
  'Change background to dark cyber glass',
];

export default function GuiPrompt({
  onGenerate,
  onModify,
  isGenerating,
  stageMessage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) {
  const [prompt, setPrompt] = useState(QUICK_PROMPTS[0].prompt);
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [activeTheme, setActiveTheme] = useState('modern');

  const handleSubmitInitial = (e) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), activeTheme);
  };

  const handleSubmitModify = (e) => {
    e?.preventDefault();
    if (!modifyPrompt.trim() || isGenerating) return;
    onModify(modifyPrompt.trim());
    setModifyPrompt('');
  };

  return (
    <div className="gui-prompt-container">
      {/* 1. Initial Generator Form */}
      <form onSubmit={handleSubmitInitial} className="gui-section-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label className="gui-label">
            <Wand2 size={14} className="accent-icon" />
            <span>Describe the GUI you want</span>
          </label>
          <div className="gui-history-btns">
            <button
              type="button"
              className="gui-history-btn"
              onClick={onUndo}
              disabled={!canUndo || isGenerating}
              title="Undo change"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              className="gui-history-btn"
              onClick={onRedo}
              disabled={!canRedo || isGenerating}
              title="Redo change"
            >
              <Redo2 size={13} />
            </button>
          </div>
        </div>

        <textarea
          className="toolbox-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Create a futuristic weapon shop with 6 weapons, a search bar, item prices, purchase buttons and a dark neon theme."
          rows={3}
          disabled={isGenerating}
        />

        {/* Quick Inspiration Chips */}
        <div className="gui-chips-row">
          <span className="gui-chips-title">Inspiration:</span>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              className="gui-chip-btn"
              onClick={() => {
                setPrompt(qp.prompt);
                setActiveTheme(qp.theme);
                onGenerate(qp.prompt, qp.theme);
              }}
              disabled={isGenerating}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Theme Pills */}
        <div className="gui-theme-row">
          <span className="gui-chips-title">Style Theme:</span>
          {[
            { id: 'modern', name: 'Dark Cyber Glass', color: '#00f0ff' },
            { id: 'cartoon', name: 'Simulator Pop', color: '#f59e0b' },
            { id: 'tactical', name: 'Minimal Tactical', color: '#10b981' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`gui-theme-pill ${activeTheme === t.id ? 'active' : ''}`}
              onClick={() => setActiveTheme(t.id)}
              disabled={isGenerating}
            >
              <span className="gui-theme-dot" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary full-width"
          style={{ marginTop: 12 }}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="spin-icon" />
              <span>Generating Roblox GUI...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate GUI with Local AI</span>
            </>
          )}
        </button>

        {/* Stage progress label */}
        {isGenerating && (
          <div className="gui-stage-banner">
            <span className="gen-dot" style={{ background: '#00f0ff' }} />
            <span className="gui-stage-text">{stageMessage || 'Analyzing prompt...'}</span>
          </div>
        )}
      </form>

      {/* 2. Iterative Modification Form */}
      <form onSubmit={handleSubmitModify} className="gui-section-box" style={{ marginTop: 14 }}>
        <label className="gui-label">
          <Sparkles size={14} className="accent-icon" />
          <span>Describe a change to modify this GUI</span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="input-field"
            value={modifyPrompt}
            onChange={(e) => setModifyPrompt(e.target.value)}
            placeholder="e.g. Make the buttons blue, add a search bar, or add 2 more items..."
            disabled={isGenerating}
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={isGenerating || !modifyPrompt.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Send size={14} />
            <span>Apply</span>
          </button>
        </div>

        {/* Quick modification suggestions */}
        <div className="gui-chips-row" style={{ marginTop: 8 }}>
          {QUICK_MODIFICATIONS.map((modText, idx) => (
            <button
              key={idx}
              type="button"
              className="gui-chip-btn"
              onClick={() => onModify(modText)}
              disabled={isGenerating}
            >
              + {modText}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
