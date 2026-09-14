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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AudioPlayer from '../components/AudioPlayer';
import { voiceService } from '../services/voice';
import { audioService } from '../services/audio';
import { api } from '../services/api';

const fallbackVoices = [
  { id: 'am_michael', name: 'Hero', style: 'Deep, grounded hero' },
  { id: 'af_heart', name: 'Heroine', style: 'Warm and expressive' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STATUS_META = {
  idle: ['Idle', 'var(--text-muted)'],
  queued: ['Queued', 'var(--text-muted)'],
  processing: ['Processing', 'var(--warning)'],
  generating: ['Generating', 'var(--warning)'],
  'post-processing': ['Post-Processing', 'var(--warning)'],
  completed: ['Completed', 'var(--success)'],
  failed: ['Failed', 'var(--error)'],
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'voices', label: 'Voices' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'music', label: 'Music' },
  { id: 'sfx', label: 'SFX' },
  { id: 'ambience', label: 'Ambience' },
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese'];
const STYLES = [
  'You decide',
  'Energetic',
  'Calm',
  'Epic',
  'Comedy',
  'Horror',
  'Whimsical',
  'Cinematic',
];

const ANALYZE_STAGES = [
  [18, 'Reading your game idea...'],
  [38, 'Mistral is identifying audio requirements...'],
  [62, 'Planning characters and dialogue...'],
  [82, 'Writing music, SFX and ambience prompts...'],
  [96, 'Finalizing the audio plan...'],
];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const speedFromLabel = (label) => {
  const t = (label || '').toLowerCase();
  if (t.includes('slow')) return 0.85;
  if (t.includes('fast')) return 1.2;
  return 1.0;
};

function StatusBlock({ st, onCancel }) {
  if (!st || st.status === 'idle') return null;
  const meta = STATUS_META[st.status] || STATUS_META.idle;
  const active = ['processing', 'generating', 'post-processing'].includes(st.status);
  return (
    <div className="gen-inline">
      <div className="gen-inline-head">
        <span className="gen-dot" style={{ background: meta[1] }} />
        <span style={{ color: meta[1] }}>{meta[0]}</span>
        {st.status === 'failed' && st.message && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{st.message}</span>
        )}
        {active && onCancel && (
          <button
            className="btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
      {active && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${st.progress || 0}%` }} />
        </div>
      )}
    </div>
  );
}

function TextToVoice({ voices }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('am_michael');
  const [speed, setSpeed] = useState(1);
  const [engine, setEngine] = useState('local');
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
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

  const handleGenerate = async () => {
    if (!text.trim() || generating) return;
    setGenerating(true);
    setGenStatus('queued');
    setProgress(0);
    setResult(null);
    setError('');

    try {
      const job = await voiceService.generate({
        text: text.trim(),
        voice,
        engine,
        speed,
      });
      setGenStatus(job.status);
      setProgress(job.progress);

      while (!abortRef.current) {
        await sleep(600);
        const check = await voiceService.getJob(job.id);
        setGenStatus(check.status);
        setProgress(check.progress);
        if (check.status === 'completed') {
          if (check.output_asset_id) {
            const blob = await api.getBlob(`/assets/${check.output_asset_id}/download`);
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = URL.createObjectURL(blob);
            setResult({ id: check.output_asset_id, name: text.trim(), url: urlRef.current });
          } else {
            setResult({ id: check.output_asset_id, name: text.trim(), url: null });
          }
          break;
        }
        if (check.status === 'failed') {
          setError('Generation failed. Please try again.');
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
    <div className="generator-layout">
      <div className="generator-sidebar">
        <div className="input-group">
          <label>Your script</label>
          <textarea
            className="input-field"
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={generating}
            rows={6}
          />
          <span className="char-count">{text.length} characters</span>
        </div>

        <div className="input-group">
          <label>Voice</label>
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

        <div className="input-group">
          <label>Engine</label>
          <div className="radio-group">
            <label className={`radio-option ${engine === 'cloud' ? 'active' : ''}`}>
              <input
                type="radio"
                name="engine"
                value="cloud"
                checked={engine === 'cloud'}
                onChange={(e) => setEngine(e.target.value)}
                disabled={generating}
              />
              <span>Cloud</span>
            </label>
            <label className={`radio-option ${engine === 'local' ? 'active' : ''}`}>
              <input
                type="radio"
                name="engine"
                value="local"
                checked={engine === 'local'}
                onChange={(e) => setEngine(e.target.value)}
                disabled={generating}
              />
              <span>Local</span>
            </label>
          </div>
        </div>

        <div className="input-group">
          <label>Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            disabled={generating}
            className="range-slider"
          />
        </div>

        <button
          className="btn btn-primary btn-lg full-width"
          onClick={handleGenerate}
          disabled={generating || !text.trim()}
        >
          <Mic size={18} />
          {generating ? 'Generating...' : 'Generate Voice'}
        </button>

        {error && <div className="auth-error">{error}</div>}

        {genStatus && (
          <StatusBlock st={{ status: genStatus, progress, message: '' }} />
        )}
      </div>

      <div className="generator-preview">
        <div className="preview-header">
          <h3>Audio Output</h3>
          {result && (
            <Link to={`/assets/${result.id}`} className="btn btn-secondary btn-sm">
              <Download size={14} />
              View Asset
            </Link>
          )}
        </div>

        <div className="audio-preview-area">
          {result ? (
            <AudioPlayer src={result.url} title={result.name} />
          ) : (
            <div className="empty-preview">
              <Mic size={40} strokeWidth={1} />
              <p>Generated audio will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameAudioPlanner({ voices }) {
  const [idea, setIdea] = useState('');
  const [language, setLanguage] = useState('English');
  const [style, setStyle] = useState('You decide');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [itemStatus, setItemStatus] = useState({});
  const [generated, setGenerated] = useState({});
  const [presets, setPresets] = useState({});
  const cancelledRef = useRef(new Set());
  const urlsRef = useRef(new Set());

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const isActive = (key) => {
    const st = itemStatus[key];
    return st && ['queued', 'processing', 'generating', 'post-processing'].includes(st.status);
  };

  const presetValue = (key, fallback) => presets[key] || fallback || 'am_michael';

  const handleAnalyze = async () => {
    if (!idea.trim() || analyzing) return;
    setAnalyzing(true);
    setError('');
    setPlan(null);
    setItemStatus({});
    setGenerated({});
    setAnalyzeProgress(6);

    const timer = setInterval(
      () => setAnalyzeProgress((p) => (p < 96 ? p + 1 : p)),
      350
    );
    try {
      const res = await voiceService.gamePlan({
        idea: idea.trim(),
        language,
        style,
      });
      setPlan(res);
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timer);
      setAnalyzeProgress(100);
      setAnalyzing(false);
    }
  };

  const cancelJob = (key) => cancelledRef.current.add(key);

  const pollJob = async (key, job) => {
    for (let i = 0; i < 300; i += 1) {
      await sleep(700);
      if (cancelledRef.current.has(key)) {
        const err = new Error('cancelled');
        err.cancelled = true;
        throw err;
      }
      const snapshot = await voiceService.getJob(job.id);
      setItemStatus((s) => ({
        ...s,
        [key]: { status: snapshot.status, progress: snapshot.progress, message: snapshot.message },
      }));
      if (snapshot.status === 'completed') return snapshot;
      if (snapshot.status === 'failed') throw new Error(snapshot.message || 'Generation failed');
    }
    throw new Error('Timed out waiting for the job.');
  };

  const generateItem = async (key, action) => {
    if (isActive(key)) return;
    cancelledRef.current.delete(key);
    setItemStatus((s) => ({ ...s, [key]: { status: 'queued', progress: 0, message: 'Queued' } }));
    setGenerated((g) => {
      const next = { ...g };
      if (next[key]?.audioUrl) {
        urlsRef.current.delete(next[key].audioUrl);
        URL.revokeObjectURL(next[key].audioUrl);
      }
      delete next[key];
      return next;
    });

    try {
      const job = await action.call();
      setItemStatus((s) => ({
        ...s,
        [key]: { status: job.status, progress: job.progress, message: job.message },
      }));
      const done = await pollJob(key, job);
      setItemStatus((s) => ({ ...s, [key]: { status: 'completed', progress: 100, message: '' } }));
      if (done.output_asset_id) {
        const blob = await api.getBlob(`/assets/${done.output_asset_id}/download`);
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        setGenerated((g) => ({
          ...g,
          [key]: {
            audioUrl: url,
            assetId: done.output_asset_id,
            name: action.meta.name,
            type: action.meta.type,
          },
        }));
      }
    } catch (e) {
      if (e && e.cancelled) {
        setItemStatus((s) => ({ ...s, [key]: { status: 'idle', progress: 0, message: '' } }));
      } else {
        setItemStatus((s) => ({
          ...s,
          [key]: { status: 'failed', progress: 0, message: e.message || 'Generation failed' },
        }));
      }
    }
  };

  const generateAll = async (list) => {
    for (const [key, action] of list) {
      if (cancelledRef.current.has(key)) continue;
      await generateItem(key, action);
    }
  };

  // ---- actions ----
  const voiceSampleText = (v) =>
    `Hi, I'm ${v.character}.${v.speaking_style ? ` ${cap(v.speaking_style)}.` : ''}`;
  const voiceCharAction = (key, v) => ({
    call: () =>
      voiceService.generate({
        text: voiceSampleText(v),
        voice: presetValue(key, v.preset),
        engine: 'local',
        speed: 1,
      }),
    meta: { name: `${v.character} — Voice Sample`, type: 'voice' },
  });
  const dialogueAction = (key, d) => ({
    call: () =>
      voiceService.generate({
        text: d.text,
        voice: presetValue(key, d.preset),
        engine: 'local',
        speed: speedFromLabel(d.speed),
      }),
    meta: { name: `${d.character} — ${d.scene}`, type: 'voice' },
  });
  const musicAction = (key, m) => ({
    call: () => audioService.generateMusic({ prompt: m.generation_prompt, name: m.title }),
    meta: { name: m.title, type: 'music' },
  });
  const sfxAction = (key, s) => ({
    call: () => audioService.generateSfx({ prompt: s.generation_prompt, name: s.name }),
    meta: { name: s.name, type: 'sfx' },
  });
  const ambienceAction = (key, a) => ({
    call: () =>
      audioService.generateAmbience({ prompt: a.generation_prompt, name: a.name }),
    meta: { name: a.name, type: 'ambience' },
  });

  const renderResult = (key) => {
    const g = generated[key];
    if (!g) return null;
    return (
      <div className="gen-result">
        <AudioPlayer src={g.audioUrl} title={g.name} />
        <div className="plan-actions">
          <span className="badge badge-info">{g.type}</span>
          <Link to={`/assets/${g.assetId}`} className="btn btn-secondary btn-sm">
            <Download size={14} />
            View Asset
          </Link>
        </div>
      </div>
    );
  };

  const statusFor = (key) => (
    <StatusBlock
      st={itemStatus[key] || { status: 'idle' }}
      onCancel={() => cancelJob(key)}
    />
  );

  const presetDropdown = (key, fallback) => (
    <select
      className="input-field inline-select"
      value={presetValue(key, fallback)}
      onChange={(e) => setPresets((p) => ({ ...p, [key]: e.target.value }))}
      disabled={isActive(key)}
    >
      {voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
          {v.style ? ` — ${v.style}` : ''}
        </option>
      ))}
    </select>
  );

  const planData = plan?.plan;

  const renderVoices = () => {
    const list = planData?.voices || [];
    return (
      <>
        <div className="plan-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              generateAll(
                list.map((v, i) => [`v-${i}`, voiceCharAction(`v-${i}`, v)])
              )
            }
            disabled={!list.length}
          >
            <Mic size={16} />
            Generate All Voices
          </button>
          <span className="char-count">Sample line per character</span>
        </div>
        {!list.length && <p className="empty-state">No voices required for this plan.</p>}
        <div className="plan-grid">
          {list.map((v, i) => {
            const key = `v-${i}`;
            return (
              <div className="plan-card" key={key}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{v.character}</h4>
                    <p className="plan-card-sub">{v.role}</p>
                  </div>
                  <span className="badge badge-info">{v.preset}</span>
                </div>
                <div className="meta-chips">
                  {[v.voice_type, v.age, v.accent, v.language].filter(Boolean).map((c, ci) => (
                    <span className="chip" key={`${ci}-${c}`}>
                      {c}
                    </span>
                  ))}
                </div>
                {v.personality && (
                  <p className="plan-card-line">
                    <strong>Personality:</strong> {v.personality}
                  </p>
                )}
                {v.speaking_style && (
                  <p className="plan-card-line">
                    <strong>Speaking style:</strong> {v.speaking_style}
                  </p>
                )}
                {v.emotional_range && (
                  <p className="plan-card-line">
                    <strong>Emotions:</strong> {v.emotional_range}
                  </p>
                )}
                {v.voice_prompt && (
                  <pre className="plan-prompt">{v.voice_prompt}</pre>
                )}
                <div className="plan-actions">
                  {presetDropdown(key, v.preset)}
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isActive(key)}
                    onClick={() => generateItem(key, voiceCharAction(key, v))}
                  >
                    <Mic size={14} />
                    Generate Voice
                  </button>
                </div>
                {statusFor(key)}
                {renderResult(key)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderDialogue = () => {
    const list = planData?.dialogue || [];
    return (
      <>
        <div className="plan-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              generateAll(list.map((d, i) => [`d-${i}`, dialogueAction(`d-${i}`, d)]))
            }
            disabled={!list.length}
          >
            <Mic size={16} />
            Generate All Dialogue
          </button>
          <span className="char-count">Uses the character's selected voice</span>
        </div>
        {!list.length && <p className="empty-state">No dialogue required for this plan.</p>}
        <div className="plan-grid">
          {list.map((d, i) => {
            const key = `d-${i}`;
            return (
              <div className="plan-card" key={key}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{d.character}</h4>
                    <p className="plan-card-sub">{d.scene}</p>
                  </div>
                  <span className="badge badge-warning">{d.emotion}</span>
                </div>
                {d.purpose && (
                  <p className="plan-card-line">
                    <strong>Purpose:</strong> {d.purpose}
                  </p>
                )}
                <p className="dialogue-text">"{d.text}"</p>
                <div className="meta-chips">
                  {[d.speed, d.pitch, d.emphasis].filter(Boolean).map((c, ci) => (
                    <span className="chip" key={`${ci}-${c}`}>
                      {c}
                    </span>
                  ))}
                </div>
                {d.voice_prompt && <pre className="plan-prompt">{d.voice_prompt}</pre>}
                <div className="plan-actions">
                  {presetDropdown(key, d.preset)}
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isActive(key)}
                    onClick={() => generateItem(key, dialogueAction(key, d))}
                  >
                    <Mic size={14} />
                    Generate Voice
                  </button>
                </div>
                {statusFor(key)}
                {renderResult(key)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderMusic = () => {
    const list = planData?.music || [];
    return (
      <>
        <div className="plan-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              generateAll(list.map((m, i) => [`m-${i}`, musicAction(`m-${i}`, m)]))
            }
            disabled={!list.length}
          >
            <Music size={16} />
            Generate All Music
          </button>
        </div>
        {!list.length && <p className="empty-state">No music required for this plan.</p>}
        <div className="plan-grid">
          {list.map((m, i) => {
            const key = `m-${i}`;
            return (
              <div className="plan-card" key={key}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{m.title}</h4>
                    <p className="plan-card-sub">{m.purpose}</p>
                  </div>
                  {m.loop ? (
                    <span className="badge badge-success">Loop</span>
                  ) : (
                    <span className="badge badge-info">One-shot</span>
                  )}
                </div>
                <div className="meta-chips">
                  {[m.mood, m.genre, m.energy, m.tempo, m.duration, m.instruments]
                    .filter(Boolean)
                    .map((c, ci) => (
                      <span className="chip" key={`${ci}-${c}`}>
                        {c}
                      </span>
                    ))}
                </div>
                {m.generation_prompt && (
                  <pre className="plan-prompt">{m.generation_prompt}</pre>
                )}
                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isActive(key)}
                    onClick={() => generateItem(key, musicAction(key, m))}
                  >
                    <Music size={14} />
                    Generate Music
                  </button>
                </div>
                {statusFor(key)}
                {renderResult(key)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderSfx = () => {
    const list = planData?.sfx || [];
    return (
      <>
        <div className="plan-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              generateAll(list.map((s, i) => [`s-${i}`, sfxAction(`s-${i}`, s)]))
            }
            disabled={!list.length}
          >
            <AudioLines size={16} />
            Generate All SFX
          </button>
        </div>
        {!list.length && <p className="empty-state">No sound effects required for this plan.</p>}
        <div className="plan-grid">
          {list.map((s, i) => {
            const key = `s-${i}`;
            return (
              <div className="plan-card" key={key}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{s.name}</h4>
                    <p className="plan-card-sub">{s.purpose}</p>
                  </div>
                  {s.duration && <span className="badge badge-info">{s.duration}</span>}
                </div>
                {s.trigger && (
                  <p className="plan-card-line">
                    <strong>Trigger:</strong> {s.trigger}
                  </p>
                )}
                {s.description && (
                  <p className="plan-card-line">
                    <strong>Description:</strong> {s.description}
                  </p>
                )}
                {s.generation_prompt && (
                  <pre className="plan-prompt">{s.generation_prompt}</pre>
                )}
                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isActive(key)}
                    onClick={() => generateItem(key, sfxAction(key, s))}
                  >
                    <AudioLines size={14} />
                    Generate SFX
                  </button>
                </div>
                {statusFor(key)}
                {renderResult(key)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderAmbience = () => {
    const list = planData?.ambience || [];
    return (
      <>
        <div className="plan-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              generateAll(list.map((a, i) => [`a-${i}`, ambienceAction(`a-${i}`, a)]))
            }
            disabled={!list.length}
          >
            <Wind size={16} />
            Generate All Ambience
          </button>
        </div>
        {!list.length && (
          <p className="empty-state">No ambient tracks required for this plan.</p>
        )}
        <div className="plan-grid">
          {list.map((a, i) => {
            const key = `a-${i}`;
            return (
              <div className="plan-card" key={key}>
                <div className="plan-card-head">
                  <div>
                    <h4 className="plan-card-title">{a.name}</h4>
                    <p className="plan-card-sub">{a.purpose}</p>
                  </div>
                  {a.loop ? (
                    <span className="badge badge-success">Loop</span>
                  ) : (
                    <span className="badge badge-info">One-shot</span>
                  )}
                </div>
                {a.description && (
                  <p className="plan-card-line">
                    <strong>Description:</strong> {a.description}
                  </p>
                )}
                {a.generation_prompt && (
                  <pre className="plan-prompt">{a.generation_prompt}</pre>
                )}
                <div className="plan-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isActive(key)}
                    onClick={() => generateItem(key, ambienceAction(key, a))}
                  >
                    <Wind size={14} />
                    Generate Ambience
                  </button>
                </div>
                {statusFor(key)}
                {renderResult(key)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const allActions = () => {
    const out = [];
    (planData?.voices || []).forEach((v, i) => out.push([`v-${i}`, voiceCharAction(`v-${i}`, v)]));
    (planData?.dialogue || []).forEach((d, i) => out.push([`d-${i}`, dialogueAction(`d-${i}`, d)]));
    (planData?.music || []).forEach((m, i) => out.push([`m-${i}`, musicAction(`m-${i}`, m)]));
    (planData?.sfx || []).forEach((s, i) => out.push([`s-${i}`, sfxAction(`s-${i}`, s)]));
    (planData?.ambience || []).forEach((a, i) => out.push([`a-${i}`, ambienceAction(`a-${i}`, a)]));
    return out;
  };

  const renderOverview = () => {
    const counts = [
      ['Voice Lines', planData?.dialogue?.length || 0],
      ['Music Tracks', planData?.music?.length || 0],
      ['Sound Effects', planData?.sfx?.length || 0],
      ['Ambient Tracks', planData?.ambience?.length || 0],
    ];
    return (
      <>
        <div className="plan-summary">
          {counts.map(([label, n]) => (
            <div className="plan-summary-item" key={label}>
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="planner-box">
          <h3>
            <Sparkles size={18} />
            {planData?.project?.title || 'Project'}
          </h3>
          <p className="box-sub">{planData?.project?.description}</p>
          <div className="meta-chips">
            <span className="chip">Language: {planData?.project?.language}</span>
            <span className="chip">{planData?.voices?.length || 0} characters</span>
          </div>
          <div className="plan-actions" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => generateAll(allActions())}
            >
              <Sparkles size={18} />
              Generate All Audio
            </button>
            <span className="char-count">
              Voices, dialogue, music, SFX and ambience — one click each.
            </span>
          </div>
        </div>
        <div className="plan-grid">
          {(planData?.voices || []).map((v, i) => (
            <div className="plan-card" key={`ov-${i}`}>
              <div className="plan-card-head">
                <div>
                  <h4 className="plan-card-title">{v.character}</h4>
                  <p className="plan-card-sub">{v.role}</p>
                </div>
                <span className="badge badge-info">{v.preset}</span>
              </div>
              <div className="plan-actions">
                {presetDropdown(`v-${i}`, v.preset)}
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isActive(`v-${i}`)}
                  onClick={() => generateItem(`v-${i}`, voiceCharAction(`v-${i}`, v))}
                >
                  <Mic size={14} />
                  Generate Voice
                </button>
              </div>
              {statusFor(`v-${i}`)}
              {renderResult(`v-${i}`)}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderTab = () => {
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

  const tabCount = (id) => {
    if (!planData) return '';
    const counts = {
      voices: planData.voices?.length,
      dialogue: planData.dialogue?.length,
      music: planData.music?.length,
      sfx: planData.sfx?.length,
      ambience: planData.ambience?.length,
    };
    return counts[id] ? ` (${counts[id]})` : '';
  };

  const stageLabel = () => {
    let label = ANALYZE_STAGES[0][1];
    for (const [t, l] of ANALYZE_STAGES) {
      if (analyzeProgress >= t) label = l;
    }
    return label;
  };

  return (
    <div className="generator-layout">
      <div className="generator-sidebar">
        <div className="planner-box">
          <h3>
            <Sparkles size={18} />
            Game Audio Planner
          </h3>
          <p className="box-sub">
            Describe your game. Mistral acts as the Audio Director and produces
            characters, dialogue, music, SFX and ambience — with ready-to-use
            generation prompts.
          </p>
          <div className="input-group">
            <label>Describe your game</label>
            <textarea
              className="input-field"
              placeholder="Create a surfing game where the player surfs through waves, performs tricks and competes against other surfers..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={analyzing}
              rows={6}
            />
            <span className="char-count">{idea.length} characters</span>
          </div>
          <div className="planner-options">
            <div className="input-group">
              <label>Language</label>
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
              <label>Style</label>
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
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyze Game
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
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>

      <div className="generator-preview">
        <div className="preview-header">
          <h3>Audio Plan</h3>
          {plan && (
            <span className="badge badge-success">
              {plan.source === 'mistral' ? 'Mistral Audio Director' : 'Demo Plan'}
            </span>
          )}
        </div>

        {!plan ? (
          <div className="audio-preview-area">
            <div className="empty-preview">
              <Sparkles size={40} strokeWidth={1} />
              <p>Your game audio plan will appear here</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {plan.source === 'fallback' && (
              <div className="source-note">
                <Sparkles size={14} />
                Showing a built-in demo plan. Add a <b>MISTRAL_API_KEY</b> in{' '}
                <b>backend/.env</b> to let Mistral generate a custom plan for your idea.
              </div>
            )}
            <div className="analyze-heading">
              <h3 className="page-title" style={{ margin: 0 }}>
                {plan.plan.project?.title || 'Game'} — Audio Plan
              </h3>
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
            {renderTab()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VoiceGenerator() {
  const [mode, setMode] = useState('tts');
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

      <h1 className="page-title">Voice Studio</h1>
      <p className="page-subtitle">Generate voices, dialogue, music and sound for your games</p>

      <div className="mode-switch">
        <button
          className={`mode-option ${mode === 'tts' ? 'active' : ''}`}
          onClick={() => setMode('tts')}
        >
          <Mic size={16} />
          Text to Voice
        </button>
        <button
          className={`mode-option ${mode === 'planner' ? 'active' : ''}`}
          onClick={() => setMode('planner')}
        >
          <Sparkles size={16} />
          Game Audio Planner
        </button>
      </div>

      {mode === 'tts' ? (
        <TextToVoice voices={voices} />
      ) : (
        <GameAudioPlanner voices={voices} />
      )}
    </div>
  );
}