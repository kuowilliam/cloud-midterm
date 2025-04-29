import axios from 'axios';

// Base URL for the API
const API_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const uploadZip = async (file) => {
  const formData = new FormData();
  formData.append('zip_file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const deleteQueueItem = async (item) => {
  const response = await api.delete(`/queue/${item}`);
  return response.data;
};

export const getWorkerStatus = async () => {
  const response = await api.get('/monitor/worker');
  return response.data;
};

export const getMonitorEvents = async (limit = 50) => {
  const response = await api.get(`/monitor/events?limit=${limit}`);
  return response.data;
};

export const searchImages = async (query, topK = 5) => {
  const response = await api.post('/search', { query, top_k: topK });
  return response.data;
};

export const getImageUrl = (path) => {
  return `${API_URL}/image/${path}`;
};

export const resetSystem = async () => {
  const response = await api.post('/reset');
  return response.data;
};

export const resetMonitorEvents = async () => {
  const response = await api.post('/monitor/events/reset');
  return response.data;
};

export const getDoneImages = async () => {
  const response = await api.get('/done');
  return response.data;
};

// Create an API object to export as default
const apiService = {
  uploadZip,
  getStatus,
  deleteQueueItem,
  getWorkerStatus,
  getMonitorEvents,
  searchImages,
  getImageUrl,
  resetSystem,
  resetMonitorEvents,
  getDoneImages,
};

export default apiService;
