import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Sparkles,
  Code2,
  Layout,
  FolderDown,
  Layers,
  Sliders,
  Eye,
  FileCode,
  Braces,
  Cpu,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import GuiPrompt from './gui/GuiPrompt';
import GuiPreview from './gui/GuiPreview';
import GuiTree from './gui/GuiTree';
import GuiInspector from './gui/GuiInspector';
import { guiService } from '../services/guiService';

export default function ToolboxModal({ modalData, onClose }) {
  if (!modalData) return null;

  const { tool, platform } = modalData;

  if (tool.actionType === 'code-modal') {
    return <CodeStudioModal tool={tool} platform={platform} onClose={onClose} />;
  }

  if (tool.actionType === 'gui-modal') {
    return <GuiStudioModal tool={tool} platform={platform} onClose={onClose} />;
  }

  return null;
}

// -------------------------------------------------------------
// CODE / LUAU SCRIPTING MODAL
// -------------------------------------------------------------
function CodeStudioModal({ tool, platform, onClose }) {
  const isRoblox = platform === 'roblox';
  const isMinecraft = platform === 'minecraft';

  const defaultTemplates = isRoblox
    ? [
        {
          id: 'leaderstats',
          name: 'Leaderstats & Coins',
          type: 'ServerScript',
          code: `-- ServerScriptService/LeaderstatsService.luau
local Players = game:GetService("Players")

local function onPlayerAdded(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 100
    coins.Parent = leaderstats

    local gems = Instance.new("IntValue")
    gems.Name = "Gems"
    gems.Value = 0
    gems.Parent = leaderstats
end

Players.PlayerAdded:Connect(onPlayerAdded)
`
        },
        {
          id: 'datastore',
          name: 'Secure DataStore System',
          type: 'ServerScript',
          code: `-- ServerScriptService/PlayerDataStore.luau
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local PlayerData = DataStoreService:GetDataStore("PlayerSave_v1")

local function loadData(player)
    local key = "Player_" .. player.UserId
    local success, data = pcall(function()
        return PlayerData:GetAsync(key)
    end)
    if success and data then
        print("Loaded data for", player.Name)
    else
        warn("Failed to load or new player:", player.Name)
    end
end

Players.PlayerAdded:Connect(loadData)
`
        },
        {
          id: 'raycast-gun',
          name: 'Raycast Blaster Tool',
          type: 'ModuleScript',
          code: `-- ReplicatedStorage/Weapons/Blaster.luau
local Workspace = game:GetService("Workspace")

local Blaster = {}
Blaster.__index = Blaster

function Blaster.new(range, damage)
    local self = setmetatable({}, Blaster)
    self.Range = range or 250
    self.Damage = damage or 35
    return self
end

function Blaster:Fire(origin, direction, ignoreList)
    local raycastParams = RaycastParams.new()
    raycastParams.FilterType = RaycastFilterType.Exclude
    raycastParams.FilterDescendantsInstances = ignoreList or {}

    local result = Workspace:Raycast(origin, direction * self.Range, raycastParams)
    if result and result.Instance then
        local humanoid = result.Instance.Parent:FindFirstChildOfClass("Humanoid")
        if humanoid then
            humanoid:TakeDamage(self.Damage)
        end
    end
    return result
end

return Blaster
`
        }
      ]
    : isMinecraft
    ? [
        {
          id: 'boss-summon',
          name: 'Boss Summon Wave',
          type: 'MCFunction',
          code: `# data/forgecraft/functions/summon_boss.mcfunction
title @a title {"text":"ANCIENT GOLEM AWAKENED","color":"red","bold":true}
playsound entity.ender_dragon.growl master @a ~ ~ ~ 2 0.8
particle minecraft:explosion ~ ~1 ~ 1 1 1 0.1 25

# Summon Custom Named Boss
summon iron_golem ~ ~ ~ {CustomName:'{"text":"Ancient Stone Guard","color":"gold"}',CustomNameVisible:1b,Health:300f,Attributes:[{Name:"generic.max_health",Base:300f}]}
effect give @e[type=iron_golem,limit=1,sort=nearest] resistance 9999 1
`
        },
        {
          id: 'loot-table',
          name: 'Custom Loot Drop',
          type: 'JSON',
          code: `{
  "type": "minecraft:chest",
  "pools": [
    {
      "rolls": 3,
      "entries": [
        {
          "type": "minecraft:item",
          "name": "minecraft:diamond",
          "weight": 15
        },
        {
          "type": "minecraft:item",
          "name": "minecraft:enchanted_golden_apple",
          "weight": 5
        }
      ]
    }
  ]
}`
        }
      ]
    : [
        {
          id: 'player-controller',
          name: '2D Platformer Controller',
          type: 'GDScript',
          code: `extends CharacterBody2D

const SPEED = 300.0
const JUMP_VELOCITY = -420.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    var direction = Input.get_axis("ui_left", "ui_right")
    if direction:
        velocity.x = direction * SPEED
    else:
        velocity.x = move_toward(velocity.x, 0, SPEED)

    move_and_slide()
`
        }
      ];

  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplates[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeCode, setActiveCode] = useState(defaultTemplates[0].code);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = isRoblox ? 'luau' : isMinecraft ? 'mcfunction' : 'gd';
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      if (isRoblox) {
        setActiveCode(`-- Generated Luau Script: ${customPrompt}
-- Optimized for Roblox Studio (Deferred Event Handling & Luau Typecheck)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")

local Module = {}
Module.__index = Module

function Module.init()
    print("[ForgeCraft AI] Loaded: ${customPrompt}")
    -- Custom logic handler
    local function executeLogic(player)
        if not player or not player.Character then return end
        -- Executed action
    end
    return executeLogic
end

return Module
`);
      } else {
        setActiveCode(`# Generated MCFunction: ${customPrompt}
execute as @a at @s run particle minecraft:soul_fire_flame ~ ~1 ~ 0.5 0.5 0.5 0.05 30
playsound minecraft:block.beacon.activate ambient @a
`);
      }
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="toolbox-modal-overlay" onClick={onClose}>
      <div className="toolbox-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="toolbox-modal-header">
          <div className="toolbox-modal-title-group">
            <div className="toolbox-modal-badge">
              <Code2 size={16} />
              <span>{isRoblox ? 'Roblox Studio Luau' : isMinecraft ? 'Minecraft Datapack' : 'Game Code'}</span>
            </div>
            <h2>{tool.title} • {tool.subtitle}</h2>
          </div>
          <button className="toolbox-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="toolbox-modal-body">
          {/* Left panel: Prompt & Templates */}
          <div className="toolbox-modal-sidebar">
            <form onSubmit={handleGenerate} className="toolbox-prompt-form">
              <label className="toolbox-label">
                <Sparkles size={14} className="accent-icon" />
                <span>AI Code Generator Prompt</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={
                  isRoblox
                    ? 'e.g. Create a coin multiplier zone that doubles collection for VIP gamepass owners...'
                    : 'e.g. Generate a custom boss wave with lightning strikes and dialogue...'
                }
                className="toolbox-textarea"
                rows={3}
              />
              <button
                type="submit"
                className="btn btn-primary full-width"
                disabled={isGenerating || !customPrompt.trim()}
              >
                {isGenerating ? 'Generating Code...' : 'Generate with AI'}
              </button>
            </form>

            <div className="toolbox-template-section">
              <span className="toolbox-section-label">Pre-Built Optimized Templates</span>
              <div className="toolbox-template-list">
                {defaultTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`toolbox-template-item ${selectedTemplate.id === tpl.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setActiveCode(tpl.code);
                    }}
                  >
                    <div className="toolbox-template-info">
                      <span className="toolbox-template-name">{tpl.name}</span>
                      <span className="toolbox-template-type">{tpl.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Live Code Editor & Actions */}
          <div className="toolbox-modal-code-area">
            <div className="toolbox-code-toolbar">
              <div className="toolbox-code-meta">
                <span className="toolbox-code-filename">
                  {selectedTemplate.name}.{isRoblox ? 'luau' : isMinecraft ? 'mcfunction' : 'gd'}
                </span>
                <span className="toolbox-code-lang">{isRoblox ? 'Roblox Luau 5.1' : 'Script'}</span>
              </div>
              <div className="toolbox-code-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? <Check size={14} color="#00d2a0" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>

            <div className="toolbox-code-view">
              <pre>
                <code>{activeCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// AI ROBLOX GUI GENERATION STUDIO MODAL
// -------------------------------------------------------------

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function findElementByPath(root, path) {
  if (!root || !path) return root;
  const parts = String(path).split('.').map(Number);
  let current = root;
  for (let i = 1; i < parts.length; i++) {
    const idx = parts[i];
    if (current && current.children && current.children[idx]) {
      current = current.children[idx];
    } else {
      return null;
    }
  }
  return current;
}

function updateElementProperty(root, path, keyPath, value) {
  const clone = JSON.parse(JSON.stringify(root));
  const parts = String(path).split('.').map(Number);
  let current = clone;
  for (let i = 1; i < parts.length; i++) {
    const idx = parts[i];
    if (current && current.children && current.children[idx]) {
      current = current.children[idx];
    }
  }
  if (keyPath === 'name') {
    current.name = value;
  } else if (keyPath.startsWith('properties.')) {
    const propKey = keyPath.replace('properties.', '');
    if (!current.properties) current.properties = {};
    current.properties[propKey] = value;
  }
  return clone;
}

function GuiStudioModal({ tool, platform, onClose }) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'tree' | 'code' | 'json'
  const [guiSpec, setGuiSpec] = useState(null);
  const [luauCode, setLuauCode] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedPath, setSelectedPath] = useState('0');
  const [selectedElement, setSelectedElement] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [stageMessage, setStageMessage] = useState('');
  const [engineStatus, setEngineStatus] = useState({ online: true, model: 'Ollama (Qwen-Coder)' });

  const [copied, setCopied] = useState(false);
  const [isExportingRbxm, setIsExportingRbxm] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Helper to commit spec to undo/redo history
  const commitSpec = useCallback(
    (newSpec, code = '') => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newSpec);
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
      setGuiSpec(newSpec);
      setSelectedPath('0');
      setSelectedElement(newSpec);
      if (code) {
        setLuauCode(code);
      } else {
        guiService.exportLuau(newSpec).then((res) => {
          if (res?.luau) setLuauCode(res.luau);
        }).catch(() => {});
      }
    },
    [historyIndex]
  );

  // Initial load: fetch status & generate initial weapon shop
  useEffect(() => {
    let mounted = true;

    guiService.getStatus().then((res) => {
      if (!mounted) return;
      if (res?.ollama_available) {
        const modelName = res.installed_models?.[0] || 'qwen3-coder';
        setEngineStatus({ online: true, model: `Ollama (${modelName})` });
      } else {
        setEngineStatus({ online: true, model: 'Local Procedural Engine' });
      }
    }).catch(() => {
      if (mounted) setEngineStatus({ online: true, model: 'Local Engine' });
    });

    // Generate initial weapon shop for instant visual delight
    setIsGenerating(true);
    setStageMessage('Loading initial Roblox Weapon Shop GUI...');
    guiService.generate({
      prompt: 'Create a futuristic weapon shop with 6 weapons, a search bar, item prices, purchase buttons and a dark neon theme.',
      theme: 'modern'
    }).then((res) => {
      if (!mounted) return;
      if (res?.gui) {
        commitSpec(res.gui, res.luau || '');
      }
    }).catch((err) => {
      console.warn('Initial GUI load warning:', err);
    }).finally(() => {
      if (mounted) {
        setIsGenerating(false);
        setStageMessage('');
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle Initial or from-scratch prompt generation
  const handleGenerate = async (promptText, theme) => {
    setIsGenerating(true);
    setStageMessage('Submitting prompt to Local Ollama AI...');
    try {
      setStageMessage('Synthesizing structured ScreenGui JSON schema...');
      const res = await guiService.generate({ prompt: promptText, theme });
      if (res?.gui) {
        commitSpec(res.gui, res.luau || '');
      }
    } catch (err) {
      console.error('GUI generation failed:', err);
      alert(`Generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
      setStageMessage('');
    }
  };

  // Handle Iterative Natural Language Modifications
  const handleModify = async (changePrompt) => {
    if (!guiSpec) return;
    setIsGenerating(true);
    setStageMessage(`Applying modification: "${changePrompt}"...`);
    try {
      const res = await guiService.modify({ gui: guiSpec, change_prompt: changePrompt });
      if (res?.gui) {
        commitSpec(res.gui, res.luau || '');
      }
    } catch (err) {
      console.error('GUI modification failed:', err);
      alert(`Modification failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
      setStageMessage('');
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const target = history[prevIdx];
      setHistoryIndex(prevIdx);
      setGuiSpec(target);
      setSelectedPath('0');
      setSelectedElement(target);
      guiService.exportLuau(target).then((r) => r?.luau && setLuauCode(r.luau)).catch(() => {});
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const target = history[nextIdx];
      setHistoryIndex(nextIdx);
      setGuiSpec(target);
      setSelectedPath('0');
      setSelectedElement(target);
      guiService.exportLuau(target).then((r) => r?.luau && setLuauCode(r.luau)).catch(() => {});
    }
  };

  // Element Selection in Viewport or Tree
  const handleSelect = (path, elem) => {
    setSelectedPath(path);
    setSelectedElement(elem || findElementByPath(guiSpec, path));
  };

  // Live Property Inspector changes
  const handlePropertyChange = (keyPath, val) => {
    if (!guiSpec || !selectedPath) return;
    const updated = updateElementProperty(guiSpec, selectedPath, keyPath, val);
    setGuiSpec(updated);
    setSelectedElement(findElementByPath(updated, selectedPath));
    guiService.exportLuau(updated).then((r) => r?.luau && setLuauCode(r.luau)).catch(() => {});
  };

  // Copy Luau code
  const handleCopyLuau = async () => {
    let codeToCopy = luauCode;
    if (!codeToCopy && guiSpec) {
      try {
        const res = await guiService.exportLuau(guiSpec);
        codeToCopy = res?.luau || '';
        setLuauCode(codeToCopy);
      } catch (e) {}
    }
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export .rbxm (Roblox Studio Model)
  const handleExportRbxm = async () => {
    if (!guiSpec) return;
    setIsExportingRbxm(true);
    try {
      const blob = await guiService.exportRbxmBlob(guiSpec);
      downloadBlob(blob, `${guiSpec.name || 'ForgeCraft_ScreenGui'}.rbxm`);
    } catch (err) {
      alert(`Export .rbxm failed: ${err.message || err}`);
    } finally {
      setIsExportingRbxm(false);
    }
  };

  // Export .zip (Complete Studio Package)
  const handleExportZip = async () => {
    if (!guiSpec) return;
    setIsExportingZip(true);
    try {
      const blob = await guiService.exportZipBlob(guiSpec);
      downloadBlob(blob, `${guiSpec.name || 'ForgeCraft_ScreenGui'}_Package.zip`);
    } catch (err) {
      alert(`Export ZIP failed: ${err.message || err}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="toolbox-modal-overlay" onClick={onClose}>
      <div className="toolbox-modal-content toolbox-modal-gui" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="toolbox-modal-header">
          <div className="toolbox-modal-title-group">
            <div className="toolbox-modal-badge">
              <Layout size={16} />
              <span>Roblox ScreenGui Studio</span>
            </div>
            <h2>AI Roblox GUI Generator • Local Ollama</h2>
            <div className="gui-engine-status-pill">
              <span className="gui-engine-status-dot" />
              <span>{engineStatus.model}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Quick Export Actions */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportRbxm}
              disabled={!guiSpec || isExportingRbxm}
              title="Download Roblox Studio XML Model (.rbxm) to insert directly into StarterGui"
            >
              <Download size={14} />
              <span>{isExportingRbxm ? 'Generating .rbxm...' : 'Export .rbxm'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportZip}
              disabled={!guiSpec || isExportingZip}
              title="Download full package with .rbxm, .luau script, and guide"
            >
              <FolderDown size={14} />
              <span>{isExportingZip ? 'Packaging...' : 'Export ZIP'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCopyLuau}
              disabled={!guiSpec}
              title="Copy Roblox Luau procedural generation script to clipboard"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Luau Copied!' : 'Copy Luau'}</span>
            </button>

            <button className="toolbox-modal-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body Split: Left Prompt & Iteration Sidebar | Right Interactive Views */}
        <div className="toolbox-gui-studio-body">
          {/* Left Panel: AI Prompts, Theming, Undo/Redo */}
          <div className="toolbox-gui-studio-sidebar">
            <GuiPrompt
              onGenerate={handleGenerate}
              onModify={handleModify}
              isGenerating={isGenerating}
              stageMessage={stageMessage}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>

          {/* Right Panel: Tabbed Viewport, Explorer Tree & Inspector, Luau Code, JSON */}
          <div className="toolbox-gui-studio-content">
            {/* View Mode Navigation Tabs */}
            <div className="gui-view-tabs">
              <button
                type="button"
                className={`gui-view-tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={15} />
                <span>Live Viewport</span>
              </button>
              <button
                type="button"
                className={`gui-view-tab ${activeTab === 'tree' ? 'active' : ''}`}
                onClick={() => setActiveTab('tree')}
              >
                <Layers size={15} />
                <span>Explorer & Inspector</span>
              </button>
              <button
                type="button"
                className={`gui-view-tab ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
              >
                <FileCode size={15} />
                <span>Luau Script</span>
              </button>
              <button
                type="button"
                className={`gui-view-tab ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                <Braces size={15} />
                <span>JSON Spec</span>
              </button>

              {guiSpec && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span>Target: <strong style={{ color: '#38bdf8' }}>{guiSpec.name}</strong></span>
                  <span>•</span>
                  <span>{guiSpec.children?.length || 0} Root Children</span>
                </div>
              )}
            </div>

            {/* View Tab 1: Live Interactive Canvas */}
            {activeTab === 'preview' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <GuiPreview
                  guiSpec={guiSpec}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                />
              </div>
            )}

            {/* View Tab 2: Explorer Tree & Property Inspector */}
            {activeTab === 'tree' && (
              <div className="gui-studio-tree-split">
                <div style={{ width: '45%', minWidth: 280, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <GuiTree
                    guiSpec={guiSpec}
                    selectedPath={selectedPath}
                    onSelect={handleSelect}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <GuiInspector
                    selectedElement={selectedElement}
                    onPropertyChange={handlePropertyChange}
                  />
                </div>
              </div>
            )}

            {/* View Tab 3: Luau Procedural Code */}
            {activeTab === 'code' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Roblox Luau Script • Run in StarterGui or Command Bar
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyLuau}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Script'}</span>
                  </button>
                </div>
                <pre className="gui-studio-code-view">
                  <code>{luauCode || '-- Generating Luau code...'}</code>
                </pre>
              </div>
            )}

            {/* View Tab 4: JSON Schema Viewer */}
            {activeTab === 'json' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Strict JSON Specification (Single Source of Truth)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(guiSpec, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="gui-studio-code-view">
                  <code>{JSON.stringify(guiSpec, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
