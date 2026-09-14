import { api } from './api';

export const threeDService = {
  generate: (data) => api.post('/3d/generate', data),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  getAsset: (id) => api.get(`/assets/${id}`),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
};
