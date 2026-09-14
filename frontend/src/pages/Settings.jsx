import { Palette, Box, Mic, Key, HardDrive } from 'lucide-react';

export default function Settings() {
  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Configure your platform preferences</p>

      <div className="settings-grid">
        <div className="card settings-section">
          <div className="settings-section-header">
            <Palette size={18} />
            <h3>General</h3>
          </div>
          <div className="input-group">
            <label>Theme</label>
            <select className="input-field">
              <option>Dark</option>
              <option>Light</option>
            </select>
          </div>
          <div className="input-group">
            <label>Default Download Format</label>
            <select className="input-field">
              <option value="glb">GLB</option>
              <option value="obj">OBJ</option>
              <option value="fbx">FBX</option>
            </select>
          </div>
        </div>

        <div className="card settings-section">
          <div className="settings-section-header">
            <Box size={18} />
            <h3>3D Model</h3>
          </div>
          <div className="setting-toggle">
            <span>TripoSR Model</span>
            <span className="badge badge-success">Enabled</span>
          </div>
          <div className="setting-toggle">
            <span>GPU Acceleration</span>
            <span className="badge badge-success">Enabled</span>
          </div>
        </div>

        <div className="card settings-section">
          <div className="settings-section-header">
            <Mic size={18} />
            <h3>Voice</h3>
          </div>
          <div className="input-group">
            <label>Voice Engine</label>
            <select className="input-field">
              <option>Cloud (ElevenLabs)</option>
              <option>Local (Kokoro)</option>
            </select>
          </div>
        </div>

        <div className="card settings-section">
          <div className="settings-section-header">
            <Key size={18} />
            <h3>API Keys</h3>
          </div>
          <div className="input-group">
            <label>ElevenLabs API Key</label>
            <input type="password" className="input-field" placeholder="sk-..." />
          </div>
          <p className="settings-note">API keys are stored securely on the server, never sent to the browser.</p>
        </div>

        <div className="card settings-section">
          <div className="settings-section-header">
            <HardDrive size={18} />
            <h3>Storage</h3>
          </div>
          <div className="setting-toggle">
            <span>Temporary Files</span>
            <button className="btn btn-secondary btn-sm">Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
