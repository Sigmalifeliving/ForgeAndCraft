import { api } from './api';

export const voiceService = {
  generate: (data) => api.post('/voice/generate', data),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  getVoices: () => api.get('/voice/voices'),
  gamePlan: (data) => api.post('/voice/game-plan', data),
};
