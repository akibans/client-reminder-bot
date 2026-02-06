import API from './api';

// Re-export the existing axios instance for consistency
const api = API;

export const templateApi = {
  // Get all templates (user's + defaults)
  getAll: () => api.get('/templates'),
  
  // Get single template by ID
  getOne: (id) => api.get(`/templates/${id}`),
  
  // Create new template
  create: (data) => api.post('/templates', data),
  
  // Update existing template
  update: (id, data) => api.put(`/templates/${id}`, data),
  
  // Delete template
  delete: (id) => api.delete(`/templates/${id}`),
  
  // Parse template with variables (test endpoint)
  parse: (template, variables) => api.post('/templates/parse', { template, variables }),
  
  // Duplicate a template
  duplicate: (id) => api.post(`/templates/${id}/duplicate`),
};

export default templateApi;
