import { api } from './api';

export const assetService = {
  list: () => api.get('/assets'),
  get: (id) => api.get(`/assets/${id}`),
  rename: (id, name) => api.patch(`/assets/${id}`, { name }),
  remove: (id) => api.delete(`/assets/${id}`),
  download: (id) => api.getBlob(`/assets/${id}/download`),
};