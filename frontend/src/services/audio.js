import { api } from './api';

export const audioService = {
  generateMusic: (data) => api.post('/music/generate', data),
  generateSfx: (data) => api.post('/sfx/generate', data),
  generateAmbience: (data) => api.post('/ambience/generate', data),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
};