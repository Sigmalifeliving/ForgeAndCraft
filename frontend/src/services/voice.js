import { api } from './api';

export const voiceService = {
  generate: (data) => api.post('/voice/generate', data),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  getVoices: () => api.get('/voice/voices'),
  gamePlan: (data) => api.post('/voice/game-plan', data),
  generateAsset: (data) => api.post('/voice/generate-asset', data),
  generateAll: (gameId) => api.post(`/voice/generate-all/${gameId}`),
  getGame: (gameId) => api.get(`/voice/games/${gameId}`),
  exportRoblox: (gameId) => api.getBlob(`/voice/games/${gameId}/export-roblox`),
};
