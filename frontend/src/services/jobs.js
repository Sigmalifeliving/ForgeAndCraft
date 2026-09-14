import { api } from './api';

export const jobService = {
  list: () => api.get('/jobs'),
  get: (id) => api.get(`/jobs/${id}`),
};