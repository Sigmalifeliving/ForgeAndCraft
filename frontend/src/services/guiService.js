import { api } from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const guiService = {
  getStatus: () => api.get('/gui/status'),
  generate: (data) => api.post('/gui/generate', data),
  modify: (data) => api.post('/gui/modify', data),
  exportLuau: (gui) => api.post('/gui/export/luau', { gui }),

  exportRbxmBlob: async (gui) => {
    const res = await fetch(`${API_BASE}/gui/export/rbxm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gui }),
    });
    if (!res.ok) throw new Error(`Roblox .rbxm export failed: HTTP ${res.status}`);
    return res.blob();
  },

  exportZipBlob: async (gui) => {
    const res = await fetch(`${API_BASE}/gui/export/zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gui }),
    });
    if (!res.ok) throw new Error(`Roblox ZIP export failed: HTTP ${res.status}`);
    return res.blob();
  },
};
