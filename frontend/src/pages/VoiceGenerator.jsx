import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Mic,
  Sparkles,
  Music,
  Wind,
  AudioLines,
  Download,
  Loader2,
  RefreshCw,
  Play,
  Package,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Layers,
  Wand2,
  Bell,
  Coins,
  History,
  Zap,
  Volume2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AudioPlayer from '../components/AudioPlayer';
import { voiceService } from '../services/voice';
import { api } from '../services/api';

const fallbackVoices = [
  { id: 'am_michael', name: 'Hero / Warrior', style: 'Deep, grounded male hero' },
  { id: 'am_adam', name: 'Narrator / Elder', style: 'Calm, wise storyteller' },
  { id: 'am_onyx', name: 'Villain / Dark', style: 'Dark, sinister and menacing' },
  { id: 'em_santa', name: 'Booming Announcer', style: 'Larger-than-life showman' },
  { id: 'em_alex', name: 'Synthetic / Robot', style: 'Precise mechanical AI' },
  { id: 'af_heart', name: 'Heroine / Guide', style: 'Warm, expressive female voice' },
  { id: 'af_bella', name: 'Elf / Mystic', style: 'Ethereal, magical and airy' },
  { id: 'af_nova', name: 'Scout / Adventurer', style: 'Youthful and curious' },
  { id: 'af_sky', name: 'Bright Companion', style: 'Cheerful and lighthearted' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'voices', label: 'Voices' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'music', label: 'Music' },
  { id: 'sfx', label: 'SFX' },
  { id: 'ambience', label: 'Ambience' },
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Hindi'];
const STYLES = [
  'You decide',
  'Dark & Atmospheric',
  'Energetic & Fast-Paced',
  'Epic Orchestral',
  'Synthwave / Cyberpunk',
  'Tropical & Sunny',
  'Mystical Fantasy',
  'Retro Arcade',
];

const ANALYZE_STAGES = [
  [12, 'Analyzing your game concept...'],
  [30, 'Mistral is designing the audio direction...'],
  [50, 'Creating characters and voice identities...'],
  [68, 'Preparing in-game dialogue lines...'],
  [82, 'Preparing sound effects and triggers...'],
  [94, 'Preparing music and atmospheric soundscapes...'],
  [100, 'Audio plan ready!'],
];

function StatusPill({ status }) {
  const s = status || 'planned';
  switch (s) {
    case 'ready':
      return (
        <span className="status-pill ready">
          <CheckCircle2 size={12} />
          Ready
        </span>
      );
    case 'generating':
      return (
        <span className="status-pill generating">
          <Loader2 size={12} className="spin-icon" />
          Generating
        </span>
      );
    case 'failed':
      return (
        <span className="status-pill failed">
          <AlertCircle size={12} />
          Failed
        </span>
      );
    default:
      return (
        <span className="status-pill planned">
          <span style={{ fontSize: '10px' }}>○</span>
          Planned
        </span>
      );
  }
}

const STUDIO_CATEGORIES = [
  { id: 'auto', label: 'Auto-Detect', icon: Sparkles, desc: 'AI analyzes prompt to pick SFX, Music, Ambience or Voice' },
  { id: 'sfx', label: 'Sound Effect (SFX)', icon: Bell, desc: 'Bells, glass breaking, impacts, weapons, Foley' },
  { id: 'music', label: 'Game Track / Music', icon: Music, desc: 'Horror tracks, synthwave, RPG loops, soundtracks' },
  { id: 'ambience', label: 'Ambience', icon: Wind, desc: 'Atmospheric drones, room tone & environment loops' },
  { id: 'voice', label: 'Voice & Speech', icon: Mic, desc: 'Character dialogue & spoken acting via Kokoro AI' },
];

const PROMPT_INSPIRATIONS = [
  { label: 'Bell Sound', prompt: 'i need a voice of a bell', category: 'sfx', icon: Bell },
  { label: 'Breaking Glass', prompt: 'it should generate the voice of the breaking glass', category: 'sfx', icon: Zap },
  { label: 'Horror Game Track', prompt: 'i need a gametrack sound for my game it is horror', category: 'music', icon: Music },
  { label: 'Sword Clash Impact', prompt: 'Sword clash metal strike impact', category: 'sfx', icon: AudioLines },
  { label: 'Arcade Coin Chime', prompt: 'Arcade coin pickup chime powerup', category: 'sfx', icon: Coins },
  { label: 'Cyberpunk Synthwave', prompt: 'Fast-paced cyberpunk synthwave game track with pumping bass', category: 'music', icon: Music },
  { label: 'Creaky Door', prompt: 'Creepy wooden dungeon door creaking open', category: 'sfx', icon: Wind },
  { label: 'Thunder Rumble', prompt: 'Heavy lightning strike and rolling thunder rumble', category: 'sfx', icon: Zap },
  { label: 'Hero Battle Cry', prompt: 'Hero warrior shout: "Charge into battle!"', category: 'voice', icon: Mic },
];

function PromptToAudioStudio({ voices, initialCategory = 'auto', initialPrompt = '' }) {
  const [text, setText] = useState(initialPrompt);
  const [category, setCategory] = useState(initialCategory);
  const [voice, setVoice] = useState('am_michael');
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [mood, setMood] = useState('');
  const [generating, setGenerating] = useState(false);
  const [stageMsg, setStageMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const abortRef = useRef(false);
  const urlRef = useRef(null);

  useEffect(
    () => () => {
      abortRef.current = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const handleGenerate = async (overridePrompt = null) => {
    const promptToUse = (overridePrompt || text).trim();
    if (!promptToUse || generating) return;
    setGenerating(true);
    setStageMsg('Queued...');
    setProgress(15);
    setError('');

    try {
      const job = await voiceService.generate({
        text: promptToUse,
        voice,
        speed,
        category,
        duration: duration > 0 ? duration : undefined,
        mood: mood || undefined,
      });

      setStageMsg(job.message || 'Processing audio prompt...');
      setProgress(job.progress || 25);

      while (!abortRef.current) {
        await sleep(500);
        const check = await voiceService.getJob(job.id);
        setStageMsg(check.message || 'Generating audio...');
        setProgress(check.progress);

        if (check.status === 'completed') {
          if (check.output_asset_id) {
            const blob = await api.getBlob(`/assets/${check.output_asset_id}/download`);
            const blobUrl = URL.createObjectURL(blob);
            urlRef.current = blobUrl;

            // Detect category from prompt or style
            let detectedCat = category !== 'auto' ? category : 'sfx';
            const lowerP = promptToUse.lower ? promptToUse.lower() : promptToUse.toLowerCase();
            if (lowerP.includes('gametrack') || lowerP.includes('music') || lowerP.includes('soundtrack')) {
              detectedCat = 'music';
            } else if (lowerP.includes('ambience') || lowerP.includes('drone')) {
              detectedCat = 'ambience';
            } else if (lowerP.includes('saying') || lowerP.includes('speaks') || lowerP.includes('"')) {
              detectedCat = 'voice';
            }

            const newResult = {
              id: check.output_asset_id,
              name: check.name || promptToUse,
              url: blobUrl,
              prompt: promptToUse,
              type: detectedCat,
            };
            setResult(newResult);
            setHistory((prev) => [newResult, ...prev.filter((h) => h.id !== newResult.id)].slice(0, 8));
          }
          break;
        }
        if (check.status === 'failed') {
          setError(check.message || 'Audio generation failed. Please try again.');
          break;
        }
      }
    } catch (e) {
      setError(e.message || 'Could not reach the backend audio engine.');
    } finally {
      setGenerating(false);
      abortRef.current = false;
    }
  };

  const handleChipClick = (chip) => {
    setText(chip.prompt);
    if (chip.category && category === 'auto') {
      // Keep category or match chip
    }
    handleGenerate(chip.prompt);
  };

  const handleSelectHistory = (item) => {
    setResult(item);
  };

  return (
    <div className="generator-layout">
      {/* Left Sidebar: Controls & Prompt */}
      <div className="generator-sidebar">
        {/* Category Pill Switcher */}
        <div className="input-group">
          <label>Audio Generation Mode</label>
          <div className="pill-toggle-group" style={{ flexWrap: 'wrap' }}>
            {STUDIO_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`pill-toggle-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                  disabled={generating}
                  title={cat.desc}
                >
                  <IconComp size={13} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="input-group">
          <label>
            {category === 'voice' ? 'Character Dialogue Script' : 'Describe the Sound or Music you need'}
          </label>
          <textarea
            className="input-field"
            placeholder={
              category === 'music'
                ? 'e.g. i need a gametrack sound for my game it is horror'
                : category === 'sfx'
                ? 'e.g. i need a voice of a bell, or voice of breaking glass'
                : 'e.g. "i need a voice of a bell", "breaking glass", or "gametrack sound for my game it is horror"'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={generating}
            rows={4}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="char-count">{text.length} characters</span>
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Inspiration Chips */}
        <div className="prompt-chips-wrapper">
          <span className="prompt-chips-label">
            <Sparkles size={12} /> Prompt Inspiration (Click to Generate):
          </span>
          <div className="prompt-chips-grid">
            {PROMPT_INSPIRATIONS.map((chip, idx) => {
              const Icon = chip.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  className="prompt-chip"
                  onClick={() => handleChipClick(chip)}
                  disabled={generating}
                >
                  <Icon size={12} />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Context Settings */}
        {(category === 'voice' || category === 'auto') && (
          <div className="input-group" style={{ marginTop: 14 }}>
            <label>Kokoro Character Voice</label>
            <select
              className="input-field"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              disabled={generating}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.style ? ` — ${v.style}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {(category === 'music' || category === 'ambience') && (
          <div className="input-group" style={{ marginTop: 14 }}>
            <label>Track Duration: {duration || (category === 'music' ? 16 : 14)}s</label>
            <input
              type="range"
              min="6"
              max="30"
              step="2"
              value={duration || 16}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={generating}
              className="range-slider"
            />
          </div>
        )}

        {category === 'sfx' && (
          <div className="input-group" style={{ marginTop: 14 }}>
            <label>SFX Duration: {duration || 2}s</label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={duration || 2}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              disabled={generating}
              className="range-slider"
            />
          </div>
        )}

        {category === 'music' && (
          <div className="input-group">
            <label>Musical Mood / Genre Override</label>
            <select
              className="input-field"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              disabled={generating}
            >
              <option value="">Auto-Detect from Prompt</option>
              <option value="horror">Horror / Eerie (Diminished & Sub Drone)</option>
              <option value="synthwave">Cyberpunk / Synthwave</option>
              <option value="medieval">Medieval / Fantasy RPG</option>
              <option value="cheerful">Cheerful / Upbeat</option>
              <option value="epic">Epic Cinematic Battle</option>
            </select>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg full-width"
          style={{ marginTop: 16 }}
          onClick={() => handleGenerate()}
          disabled={generating || !text.trim()}
        >
          {generating ? (
            <>
              <Loader2 size={18} className="spin-icon" />
              Generating Audio...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              Generate Audio
            </>
          )}
        </button>

        {generating && (
          <div className="gen-inline" style={{ marginTop: 12 }}>
            <div className="gen-inline-head">
              <span className="gen-dot" style={{ background: 'var(--accent)' }} />
              <span className="analyze-stage">{stageMsg}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* Right Preview Area */}
      <div className="generator-preview">
        <div className="preview-header">
          <h3>Generated Audio Output</h3>
          {result && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`audio-type-badge ${result.type || 'sfx'}`}>
                {result.type ? result.type.toUpperCase() : 'AUDIO'}
              </span>
              <Link to={`/assets/${result.id}`} className="btn btn-secondary btn-sm">
                <Package size={14} />
                View Asset
              </Link>
            </div>
          )}
        </div>

        <div className="audio-preview-area">
          {result ? (
            <div className="studio-result-card" style={{ width: '100%' }}>
              <div className="studio-result-meta">
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{result.name}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Prompt: <i>"{result.prompt}"</i>
                  </p>
                </div>
                <span className={`audio-type-badge ${result.type || 'sfx'}`}>
                  {result.type ? result.type.toUpperCase() : 'AUDIO'}
                </span>
              </div>

              <AudioPlayer src={result.url} title={result.name} />

              <div className="studio-result-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  title="Re-generate with procedural seed variation"
                >
                  <RefreshCw size={14} />
                  Generate Variation
                </button>
                <a
                  href={result.url}
                  download={`${result.name.replace(/\s+/g, '_')}.wav`}
                  className="btn btn-primary btn-sm"
                >
                  <Download size={14} />
                  Download WAV
                </a>
              </div>
            </div>
          ) : (
            <div className="empty-preview">
              <Volume2 size={44} strokeWidth={1.2} />
              <h4>AI Sound & Voice Studio Ready</h4>
              <p style={{ maxWidth: 440, margin: '8px auto' }}>
                Type what you need (e.g. <i>"i need a voice of a bell"</i>, <i>"voice of breaking glass"</i>, or <i>"gametrack sound for my game it is horror"</i>) or pick an inspiration chip to create instant game-ready audio.
              </p>
            </div>
          )}
        </div>

        {/* Session History Tray */}
        {history.length > 1 && (
          <div className="recent-gens-tray" style={{ padding: '0 20px 20px 20px' }}>
            <span className="recent-gens-title">
              <History size={14} /> Recent Session Clips ({history.length}):
            </span>
            <div className="recent-gens-list">
              {history.map((h) => (
                <div
                  key={h.id}
                  className={`recent-gen-item ${result?.id === h.id ? 'active' : ''}`}
                  onClick={() => handleSelectHistory(h)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`audio-type-badge ${h.type || 'sfx'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {h.type}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{h.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {result?.id === h.id ? '▶ Active' : 'Switch'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameAudioPlanner({ voices, initialPrompt = '', platform = '' }) {
  const [idea, setIdea] = useState(initialPrompt);
  const [language, setLanguage] = useState('English');
  const [style, setStyle] = useState('You decide');
  const [budget, setBudget] = useState('medium');
  const [aiMode, setAiMode] = useState('live'); // 'live' | 'demo'

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [planResult, setPlanResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  // Asset generation states: { [assetId]: { status, audioUrl, duration, error } }
  const [assetStates, setAssetStates] = useState({});
  const [voiceOverrides, setVoiceOverrides] = useState({});
  const [speedOverrides, setSpeedOverrides] = useState({});
  const [exporting, setExporting] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);

  const audioBlobUrls = useRef(new Set());

  useEffect(
    () => () => {
      audioBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const handleAnalyze = async () => {
    if (!idea.trim() || analyzing) return;
    setAnalyzing(true);
    setError('');
    setPlanResult(null);
    setAssetStates({});
    setAnalyzeProgress(10);

    const timer = setInterval(() => {
      setAnalyzeProgress((p) => (p < 92 ? p + 2 : p));
    }, 450);

    try {
      const res = await voiceService.gamePlan({
        idea: idea.trim(),
        language,
        style,
        budget,
        mode: aiMode,
      });
      clearInterval(timer);
      setAnalyzeProgress(100);
      setPlanResult(res);

      // Initialize asset status mapping
      const initialMap = {};
      const p = res.plan;
      [
        ...(p.voices || []),
        ...(p.dialogue || []),
        ...(p.music || []),
        ...(p.sfx || []),
        ...(p.ambience || []),
      ].forEach((item) => {
        initialMap[item.asset_id] = {
          status: item.status || 'planned',
          duration: item.duration || item.audio_duration || 0,
          audioUrl: '',
        };
      });
      setAssetStates(initialMap);
    } catch (e) {
      clearInterval(timer);
      setError(e.message || 'Mistral AI Planning failed. Please verify API key or try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateAsset = async (assetId, itemCategory, regenerate = false) => {
    if (!planResult) return;
    setAssetStates((prev) => ({
      ...prev,
      [assetId]: { ...(prev[assetId] || {}), status: 'generating', error: null },
    }));

    try {
      const payload = {
        game_id: planResult.game_id,
        asset_id: assetId,
        regenerate,
        voice: voiceOverrides[assetId] || undefined,
        speed: speedOverrides[assetId] || undefined,
      };
      const res = await voiceService.generateAsset(payload);

      // Fetch blob to play locally with object URL
      const blob = await api.getBlob(`/voice/asset-file/${assetId}`);
      const blobUrl = URL.createObjectURL(blob);
      audioBlobUrls.current.add(blobUrl);

      setAssetStates((prev) => ({
        ...prev,
        [assetId]: {
          status: 'ready',
          duration: res.duration,
          audioUrl: blobUrl,
          downloadUrl: `/api/voice/asset-file/${assetId}`,
        },
      }));
    } catch (e) {
      setAssetStates((prev) => ({
        ...prev,
        [assetId]: {
          status: 'failed',
          error: e.message || 'Generation failed',
        },
      }));
    }
  };

  const handleGenerateAll = async (items) => {
    if (batchGenerating) return;
    setBatchGenerating(true);
    for (const item of items) {
      await handleGenerateAsset(item.asset_id, item.category, false);
    }
    setBatchGenerating(false);
  };

  const handleExportRoblox = async () => {
    if (!planResult || exporting) return;
    setExporting(true);
    try {
      const blob = await voiceService.exportRoblox(planResult.game_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ForgeCraft_${planResult.game_id}_RobloxAudio.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Roblox export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const stageLabel = () => {
    let label = ANALYZE_STAGES[0][1];
    for (const [t, l] of ANALYZE_STAGES) {
      if (analyzeProgress >= t) label = l;
    }
    return label;
  };

  const plan = planResult?.plan;
  const direction = plan?.direction || {};

  const tabCount = (id) => {
    if (!plan) return '';
    const counts = {
      voices: plan.voices?.length,
      dialogue: plan.dialogue?.length,
      music: plan.music?.length,
      sfx: plan.sfx?.length,
      ambience: plan.ambience?.length,
    };
    return counts[id] !== undefined ? ` (${counts[id]})` : '';
  };

  // ---- RENDERERS ----

  const renderOverview = () => {
    const allItems = [
      ...(plan.voices || []).map((v) => ({ ...v, category: 'voice' })),
      ...(plan.dialogue || []).map((d) => ({ ...d, category: 'dialogue' })),
      ...(plan.music || []).map((m) => ({ ...m, category: 'music' })),
      ...(plan.sfx || []).map((s) => ({ ...s, category: 'sfx' })),
      ...(plan.ambience || []).map((a) => ({ ...a, category: 'ambience' })),
    ];

    const counts = [
      ['Characters', plan.voices?.length || 0],
      ['Dialogue Lines', plan.dialogue?.length || 0],
      ['Music Tracks', plan.music?.length || 0],
      ['Sound Effects', plan.sfx?.length || 0],
      ['Ambient Loops', plan.ambience?.length || 0],
    ];

    return (
      <>
        {/* Roblox Export Header */}
        <div className="roblox-export-bar">
          <div className="roblox-export-info">
            <h4>Roblox Studio Audio Package</h4>
            <p>
              Project audio structure with <code>manifest.json</code> and categorized WAV folders
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportRoblox}
            disabled={exporting}
          >
            {exporting ? <Loader2 size={15} className="spin-icon" /> : <Package size={15} />}
            Export Roblox Audio (.zip)
          </button>
        </div>

        {/* Counts summary */}
        <div className="plan-summary">
          {counts.map(([label, n]) => (
            <div className="plan-summary-item" key={label}>
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Structured AI Audio Director Decisions */}
        <h4 style={{ margin: '18px 0 8px 0', fontSize: '1rem' }}>
          <Sliders size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Audio Direction & Sound Philosophy
        </h4>
        <div className="director-overview-grid">
          <div className="director-card">
            <span className="director-card-label">Game Genre</span>
            <span className="director-card-val">{direction.genre || 'Action / Adventure'}</span>
          </div>
          <div className="director-card">
            <span className="director-card-label">Audio Direction</span>
            <span className="director-card-sub">
              {direction.audio_direction || 'Tailored game sound design.'}
            </span>
          </div>
          <div className="director-card">
            <span className="director-card-label">Primary Mood</span>
            <div className="meta-chips" style={{ marginTop: 4 }}>
              {direction.primary_mood?.map((m, i) => (
                <span key={i} className="chip">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="director-card">
            <span className="director-card-label">Voice Casting Style</span>
            <span className="director-card-sub">{direction.voice_style || 'Natural'}</span>
          </div>
          <div className="director-card">
            <span className="director-card-label">Music Direction</span>
            <span className="director-card-sub">
              {direction.music_direction || 'High-energy soundtrack'}
            </span>
          </div>
          <div className="director-card">
            <span className="director-card-label">Key Environments</span>
            <span className="director-card-sub">{direction.environment || 'Various'}</span>
          </div>
        </div>

        {/* Batch Generate button */}
        <div className="planner-box" style={{ marginTop: 20 }}>
          <div className="plan-actions" style={{ justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: 0 }}>Full Audio Production</h4>
              <p className="box-sub" style={{ margin: '4px 0 0 0' }}>
                Generate all planned voice, dialogue, music, SFX, and ambience files locally.
              </p>
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => handleGenerateAll(allItems)}
              disabled={batchGenerating}
            >
              {batchGenerating ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  Generating All Assets...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate All Audio ({allItems.length})
                </>
              )}
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderVoices = () => {
    const list = plan.voices || [];
    return (
      <>
        <div className="plan-actions" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerateAll(list.map((v) => ({ ...v, category: 'voice' })))}
            disabled={batchGenerating || !list.length}
          >
            <Mic size={16} />
            Generate All Voices
          </button>
          <span className="char-count">Synthesizes sample line per character via Kokoro</span>
        </div>
        <div className="plan-grid">
          {list.map((v) => {
            const st = assetStates[v.asset_id] || { status: 'planned' };
            const selectedVoice = voiceOverrides[v.asset_id] || v.kokoro_voice || v.preset;
            return (
              <div className="plan-card" key={v.asset_id}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{v.character}</h4>
                    <p className="plan-card-sub">{v.role}</p>
                  </div>
                  <StatusPill status={st.status} />
                </div>
                <div className="meta-chips">
                  {[v.voice_type, v.gender, v.age, v.personality].filter(Boolean).map((c, i) => (
                    <span className="chip" key={i}>
                      {c}
                    </span>
                  ))}
                </div>
                {v.speaking_style && (
                  <p className="plan-card-line">
                    <strong>Delivery:</strong> {v.speaking_style}
                  </p>
                )}
                {v.voice_prompt && <pre className="plan-prompt">{v.voice_prompt}</pre>}

                <div className="plan-actions">
                  <select
                    className="input-field inline-select"
                    value={selectedVoice}
                    onChange={(e) =>
                      setVoiceOverrides((prev) => ({ ...prev, [v.asset_id]: e.target.value }))
                    }
                    disabled={st.status === 'generating'}
                  >
                    {voices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.style ? `— ${opt.style}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st.status === 'generating'}
                    onClick={() => handleGenerateAsset(v.asset_id, 'voice', st.status === 'ready')}
                  >
                    {st.status === 'generating' ? (
                      <Loader2 size={14} className="spin-icon" />
                    ) : st.status === 'ready' ? (
                      <RefreshCw size={14} />
                    ) : (
                      <Mic size={14} />
                    )}
                    {st.status === 'ready' ? 'Regenerate' : 'Generate Voice'}
                  </button>
                  {st.status === 'ready' && (
                    <a
                      href={`/api/voice/asset-file/${v.asset_id}`}
                      download={`${v.character}_voice.wav`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {st.audioUrl && (
                  <div className="gen-result">
                    <AudioPlayer src={st.audioUrl} title={`${v.character} Voice Sample`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderDialogue = () => {
    const list = plan.dialogue || [];
    return (
      <>
        <div className="plan-actions" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerateAll(list.map((d) => ({ ...d, category: 'dialogue' })))}
            disabled={batchGenerating || !list.length}
          >
            <Mic size={16} />
            Generate All Dialogue
          </button>
          <span className="char-count">Uses Kokoro local speech synthesis</span>
        </div>
        <div className="plan-grid">
          {list.map((d) => {
            const st = assetStates[d.asset_id] || { status: 'planned' };
            const selectedVoice = voiceOverrides[d.asset_id] || d.preset || 'am_michael';
            return (
              <div className="plan-card" key={d.asset_id}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{d.character}</h4>
                    <p className="plan-card-sub">{d.scene}</p>
                  </div>
                  <StatusPill status={st.status} />
                </div>
                <p className="dialogue-text">"{d.text}"</p>
                <div className="meta-chips">
                  {[d.emotion, `Speed: ${d.speed || 'moderate'}`].filter(Boolean).map((c, i) => (
                    <span className="chip" key={i}>
                      {c}
                    </span>
                  ))}
                </div>
                {d.purpose && (
                  <p className="plan-card-line">
                    <strong>Context:</strong> {d.purpose}
                  </p>
                )}

                <div className="plan-actions">
                  <select
                    className="input-field inline-select"
                    value={selectedVoice}
                    onChange={(e) =>
                      setVoiceOverrides((prev) => ({ ...prev, [d.asset_id]: e.target.value }))
                    }
                    disabled={st.status === 'generating'}
                  >
                    {voices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st.status === 'generating'}
                    onClick={() => handleGenerateAsset(d.asset_id, 'dialogue', st.status === 'ready')}
                  >
                    {st.status === 'generating' ? (
                      <Loader2 size={14} className="spin-icon" />
                    ) : st.status === 'ready' ? (
                      <RefreshCw size={14} />
                    ) : (
                      <Mic size={14} />
                    )}
                    {st.status === 'ready' ? 'Regenerate' : 'Generate Line'}
                  </button>
                  {st.status === 'ready' && (
                    <a
                      href={`/api/voice/asset-file/${d.asset_id}`}
                      download={`${d.character}_${d.scene}.wav`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {st.audioUrl && (
                  <div className="gen-result">
                    <AudioPlayer src={st.audioUrl} title={`${d.character} — ${d.scene}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderMusic = () => {
    const list = plan.music || [];
    return (
      <>
        <div className="plan-actions" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerateAll(list.map((m) => ({ ...m, category: 'music' })))}
            disabled={batchGenerating || !list.length}
          >
            <Music size={16} />
            Generate All Music Tracks
          </button>
          <span className="char-count">Procedural multi-layer local synthesizer</span>
        </div>
        <div className="plan-grid">
          {list.map((m) => {
            const st = assetStates[m.asset_id] || { status: 'planned' };
            return (
              <div className="plan-card" key={m.asset_id}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{m.title}</h4>
                    <p className="plan-card-sub">{m.purpose}</p>
                  </div>
                  <StatusPill status={st.status} />
                </div>
                <div className="meta-chips">
                  {[m.genre, m.mood, `${m.tempo} BPM`, `${m.energy} Energy`].filter(Boolean).map((c, i) => (
                    <span className="chip" key={i}>
                      {c}
                    </span>
                  ))}
                  {m.loop && <span className="badge badge-success">Loop</span>}
                </div>
                {m.instruments && (
                  <p className="plan-card-line">
                    <strong>Instruments:</strong> {m.instruments}
                  </p>
                )}
                {m.generation_prompt && <pre className="plan-prompt">{m.generation_prompt}</pre>}

                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st.status === 'generating'}
                    onClick={() => handleGenerateAsset(m.asset_id, 'music', st.status === 'ready')}
                  >
                    {st.status === 'generating' ? (
                      <Loader2 size={14} className="spin-icon" />
                    ) : st.status === 'ready' ? (
                      <RefreshCw size={14} />
                    ) : (
                      <Music size={14} />
                    )}
                    {st.status === 'ready' ? 'Regenerate Variation' : 'Generate Music'}
                  </button>
                  {st.status === 'ready' && (
                    <a
                      href={`/api/voice/asset-file/${m.asset_id}`}
                      download={`${m.title}.wav`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {st.audioUrl && (
                  <div className="gen-result">
                    <AudioPlayer src={st.audioUrl} title={m.title} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderSfx = () => {
    const list = plan.sfx || [];
    return (
      <>
        <div className="plan-actions" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerateAll(list.map((s) => ({ ...s, category: 'sfx' })))}
            disabled={batchGenerating || !list.length}
          >
            <AudioLines size={16} />
            Generate All Sound Effects
          </button>
          <span className="char-count">Local procedural sound design synthesis</span>
        </div>
        <div className="plan-grid">
          {list.map((s) => {
            const st = assetStates[s.asset_id] || { status: 'planned' };
            return (
              <div className="plan-card" key={s.asset_id}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{s.name}</h4>
                    <p className="plan-card-sub">{s.purpose}</p>
                  </div>
                  <StatusPill status={st.status} />
                </div>
                <div className="meta-chips">
                  {[s.category, `Trigger: ${s.trigger || 'Action'}`, `${s.duration}s`].filter(Boolean).map((c, i) => (
                    <span className="chip" key={i}>
                      {c}
                    </span>
                  ))}
                </div>
                {s.description && (
                  <p className="plan-card-line">
                    <strong>Sound:</strong> {s.description}
                  </p>
                )}
                {s.generation_prompt && <pre className="plan-prompt">{s.generation_prompt}</pre>}

                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st.status === 'generating'}
                    onClick={() => handleGenerateAsset(s.asset_id, 'sfx', st.status === 'ready')}
                  >
                    {st.status === 'generating' ? (
                      <Loader2 size={14} className="spin-icon" />
                    ) : st.status === 'ready' ? (
                      <RefreshCw size={14} />
                    ) : (
                      <AudioLines size={14} />
                    )}
                    {st.status === 'ready' ? 'Regenerate SFX' : 'Generate SFX'}
                  </button>
                  {st.status === 'ready' && (
                    <a
                      href={`/api/voice/asset-file/${s.asset_id}`}
                      download={`${s.name}.wav`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {st.audioUrl && (
                  <div className="gen-result">
                    <AudioPlayer src={st.audioUrl} title={s.name} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderAmbience = () => {
    const list = plan.ambience || [];
    return (
      <>
        <div className="plan-actions" style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleGenerateAll(list.map((a) => ({ ...a, category: 'ambience' })))}
            disabled={batchGenerating || !list.length}
          >
            <Wind size={16} />
            Generate All Ambience Loops
          </button>
          <span className="char-count">Seamless looping soundscapes</span>
        </div>
        <div className="plan-grid">
          {list.map((a) => {
            const st = assetStates[a.asset_id] || { status: 'planned' };
            return (
              <div className="plan-card" key={a.asset_id}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{a.name}</h4>
                    <p className="plan-card-sub">{a.purpose}</p>
                  </div>
                  <StatusPill status={st.status} />
                </div>
                <div className="meta-chips">
                  {a.loop ? (
                    <span className="badge badge-success">Seamless Loop</span>
                  ) : (
                    <span className="badge badge-info">One-shot</span>
                  )}
                </div>
                {a.description && (
                  <p className="plan-card-line">
                    <strong>Soundscape:</strong> {a.description}
                  </p>
                )}
                {a.generation_prompt && <pre className="plan-prompt">{a.generation_prompt}</pre>}

                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={st.status === 'generating'}
                    onClick={() => handleGenerateAsset(a.asset_id, 'ambience', st.status === 'ready')}
                  >
                    {st.status === 'generating' ? (
                      <Loader2 size={14} className="spin-icon" />
                    ) : st.status === 'ready' ? (
                      <RefreshCw size={14} />
                    ) : (
                      <Wind size={14} />
                    )}
                    {st.status === 'ready' ? 'Regenerate Ambience' : 'Generate Ambience'}
                  </button>
                  {st.status === 'ready' && (
                    <a
                      href={`/api/voice/asset-file/${a.asset_id}`}
                      download={`${a.name}.wav`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {st.audioUrl && (
                  <div className="gen-result">
                    <AudioPlayer src={st.audioUrl} title={a.name} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'voices':
        return renderVoices();
      case 'dialogue':
        return renderDialogue();
      case 'music':
        return renderMusic();
      case 'sfx':
        return renderSfx();
      case 'ambience':
        return renderAmbience();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="generator-layout">
      {/* Sidebar / Controls */}
      <div className="generator-sidebar">
        <div className="planner-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} />
              Game Audio Director
            </h3>
            {platform === 'roblox' && (
              <span className="badge badge-info">Roblox Studio</span>
            )}
          </div>
          <p className="box-sub">
            Describe your game concept. Mistral designs the full audio architecture; local Kokoro and procedural synthesizers generate all game-ready WAV audio.
          </p>

          {/* AI Mode Selector (Live AI vs Demo) */}
          <div className="input-group">
            <label>AI Mode</label>
            <div className="pill-toggle-group">
              <button
                type="button"
                className={`pill-toggle-btn ${aiMode === 'live' ? 'active' : ''}`}
                onClick={() => setAiMode('live')}
                disabled={analyzing}
              >
                <Sparkles size={14} />
                Live AI (Mistral)
              </button>
              <button
                type="button"
                className={`pill-toggle-btn ${aiMode === 'demo' ? 'active' : ''}`}
                onClick={() => setAiMode('demo')}
                disabled={analyzing}
              >
                <Layers size={14} />
                Demo / Offline
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div className="input-group">
            <label>Describe your game</label>
            <textarea
              className="input-field"
              placeholder="e.g. Create a dark horror survival game where the player explores an abandoned hospital."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={analyzing}
              rows={5}
            />
            <span className="char-count">{idea.length} characters</span>
          </div>

          {/* Budget Selector */}
          <div className="input-group">
            <label>Audio Package Budget</label>
            <div className="pill-toggle-group">
              {['low', 'medium', 'high'].map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`pill-toggle-btn ${budget === b ? 'active' : ''}`}
                  onClick={() => setBudget(b)}
                  disabled={analyzing}
                >
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="planner-options">
            <div className="input-group">
              <label>Spoken Language</label>
              <select
                className="input-field"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={analyzing}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Style Vibe</label>
              <select
                className="input-field"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={analyzing}
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg full-width"
            style={{ marginTop: 16 }}
            onClick={handleAnalyze}
            disabled={analyzing || !idea.trim()}
          >
            {analyzing ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                Designing Audio Plan...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyze & Design Audio Plan
              </>
            )}
          </button>

          {analyzing && (
            <div className="gen-inline">
              <div className="gen-inline-head">
                <span className="gen-dot" style={{ background: 'var(--accent)' }} />
                <span className="analyze-stage">{stageLabel()}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${analyzeProgress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} />
                <strong>AI Planning Failed</strong>
              </div>
              <p style={{ margin: '6px 0 10px 0', fontSize: '0.82rem' }}>{error}</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleAnalyze}
                style={{ width: '100%' }}
              >
                <RefreshCw size={14} /> Retry with Mistral
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="generator-preview">
        <div className="preview-header">
          <h3>Audio Plan</h3>
          {planResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge ${planResult.source === 'mistral' ? 'badge-success' : 'badge-warning'}`}>
                {planResult.source === 'mistral' ? 'Mistral Audio Director' : 'Demo Plan (Offline)'}
              </span>
              <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                {planResult.game_id}
              </span>
            </div>
          )}
        </div>

        {!planResult ? (
          <div className="audio-preview-area">
            <div className="empty-preview">
              <Sparkles size={44} strokeWidth={1} />
              <h4>Describe your game idea to begin</h4>
              <p>
                Mistral AI will determine characters, dialogue, music style, sound effects, and ambience tailored to your gameplay.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {planResult.source === 'demo' && (
              <div className="source-note">
                <Sparkles size={14} />
                Showing built-in offline demo plan. Switch AI Mode to <b>Live AI</b> to let Mistral generate a custom audio package.
              </div>
            )}

            <div className="analyze-heading" style={{ marginBottom: 14 }}>
              <h2 className="page-title" style={{ margin: 0, fontSize: '1.4rem' }}>
                {plan.project?.title || 'Game Audio Plan'}
              </h2>
              <p className="page-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                {plan.project?.description}
              </p>
            </div>

            <div className="plan-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`plan-tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {tabCount(t.id)}
                </button>
              ))}
            </div>

            {renderActiveTab()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VoiceGenerator() {
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get('mode');
  const platform = searchParams.get('platform') || '';

  // Determine initial category and tab mode
  const defaultMode = queryMode === 'planner' ? 'planner' : 'studio';
  const initialCategory = queryMode === 'sfx' ? 'sfx' : queryMode === 'music' ? 'music' : 'auto';

  const [mode, setMode] = useState(defaultMode);
  const [voices, setVoices] = useState(fallbackVoices);

  useEffect(() => {
    let cancelled = false;
    voiceService
      .getVoices()
      .then((data) => {
        if (!cancelled && data.length > 0) {
          setVoices((current) => {
            const merged = [...current];
            for (const v of data) {
              if (!merged.some((m) => m.id === v.id)) merged.push(v);
            }
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-container">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">Voice & Audio Studio</h1>
          <p className="page-subtitle">
            AI Prompt-to-Audio Generation, Sound Effects, Gametracks, Kokoro Voices & Audio Planning
          </p>
        </div>
        {platform === 'roblox' && (
          <span className="badge badge-info" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            Roblox Studio Integration Active
          </span>
        )}
      </div>

      <div className="mode-switch">
        <button
          className={`mode-option ${mode === 'studio' || mode === 'tts' ? 'active' : ''}`}
          onClick={() => setMode('studio')}
        >
          <Wand2 size={16} />
          AI Sound & Voice Studio
        </button>
        <button
          className={`mode-option ${mode === 'planner' ? 'active' : ''}`}
          onClick={() => setMode('planner')}
        >
          <Sparkles size={16} />
          Game Audio Planner
        </button>
      </div>

      {mode === 'planner' ? (
        <GameAudioPlanner voices={voices} platform={platform} />
      ) : (
        <PromptToAudioStudio voices={voices} initialCategory={initialCategory} />
      )}
    </div>
  );
}