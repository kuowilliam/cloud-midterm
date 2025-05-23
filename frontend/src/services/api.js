// src/services/api.js

import axios from 'axios';

// 建立 axios 實例，使用前端 proxy 到後端
const api = axios.create({
  baseURL: '/',  // 已在 package.json 中設定 proxy: http://localhost:8000
});

// 請求攔截器：自動為每次請求加上 Bearer Token，並讓 FormData 使用預設 Content-Type
api.interceptors.request.use(
  (config) => {
    console.log('📤 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      timestamp: new Date().toISOString()
    });
    
    const token = sessionStorage.getItem('access_token');
    const type  = sessionStorage.getItem('token_type');
    if (token && type) {
      config.headers.Authorization = `${type} ${token}`;
      console.log('🔑 [API Auth] Token added to request');
    } else {
      console.warn('⚠️ [API Auth] No token found in sessionStorage');
    }
    
    // 如果是 FormData，讓 axios 自動設定 multipart/form-data boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('📋 [API FormData] Content-Type removed for multipart/form-data');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]', error);
    return Promise.reject(error);
  }
);

// 響應攔截器：記錄響應信息
api.interceptors.response.use(
  (response) => {
    console.log('📥 [API Response Success]', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data,
      headers: response.headers,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    console.error('❌ [API Response Error]', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
      headers: error.response?.headers,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);

// 上傳圖像 ZIP 檔案
export const uploadZip = async (file) => {
  console.log('🔧 [API] uploadZip called with file:', file.name);
  
  const formData = new FormData();
  formData.append('zip_file', file);
  
  console.log('📋 [API] FormData created, making POST request to /upload');
  
  try {
    const response = await api.post('/upload', formData);
    console.log('✅ [API] uploadZip successful, response:', response);
    return response.data;
  } catch (error) {
    console.error('❌ [API] uploadZip failed:', error);
    throw error;
  }
};

// 上傳 PDF 或 PDF-Image ZIP 檔案
export const uploadPdfOrZip = async (file) => {
  console.log('🔧 [API] uploadPdfOrZip called with file:', file.name);
  
  const formData = new FormData();
  formData.append('upload_file', file);
  
  console.log('📋 [API] FormData created, making POST request to /upload/pdf');
  
  try {
    const response = await api.post('/upload/pdf', formData);
    console.log('✅ [API] uploadPdfOrZip successful, response:', response);
    return response.data;
  } catch (error) {
    console.error('❌ [API] uploadPdfOrZip failed:', error);
    throw error;
  }
};

// 取得系統狀態
export const getStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

// 刪除佇列項目
export const deleteQueueItem = async (item) => {
  const response = await api.delete(`/queue/${item}`);
  return response.data;
};

// 取得 Worker 狀態
export const getWorkerStatus = async () => {
  const response = await api.get('/monitor/worker');
  return response.data;
};

// 取得 Monitor 事件
export const getMonitorEvents = async (limit = 50) => {
  const response = await api.get(`/monitor/events?limit=${limit}`);
  return response.data;
};

// 圖像搜尋，可附帶文字與檔案
export const searchImages = async (query, imageFile, topK = 5) => {
  console.log('🔍 [API] searchImages called with:', { query, imageFile: imageFile?.name, topK });
  
  const formData = new FormData();
  
  // 修正後端驗證邏輯：只能提供文字或圖片其中一個，不能同時提供
  // 如果同時提供，優先使用圖片搜索
  if (imageFile) {
    // 只使用圖片搜索，不加入文字查詢
    formData.append('image', imageFile);
    console.log('🔍 [API] Image search mode - using image only');
  } else if (query && query.trim()) {
    // 只使用文字搜索
    formData.append('query', query.trim());
    console.log('🔍 [API] Text search mode - using query only');
  } else {
    // 兩者都沒有，拋出錯誤
    throw new Error('Must provide either text query or image file for search');
  }

  try {
    // top_k 作為 query parameter
    console.log('🔍 [API] Making search request to:', `/search?top_k=${topK}`);
    const response = await api.post(`/search?top_k=${topK}`, formData);
    console.log('✅ [API] Search response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [API] Search request failed:', error);
    throw error;
  }
};

// 取得影像路徑 URL
export const getImageUrl = (path) => {
  return `${api.defaults.baseURL}image/${path}`;
};

// 重置系統
export const resetSystem = async () => {
  const response = await api.post('/reset');
  return response.data;
};

// 重置 Monitor 事件
export const resetMonitorEvents = async () => {
  const response = await api.post('/monitor/events/reset');
  return response.data;
};

// 取得已完成的影像列表
export const getDoneImages = async () => {
  const response = await api.get('/done');
  return response.data;
};

// PDF 文件搜尋
export const searchPdf = async (query, topK = 1) => {
  const response = await api.post(
    `/search/pdf?top_k=${topK}&query=${encodeURIComponent(query)}`
  );
  return response.data;
};

// 匯出所有 API 函數
const apiService = {
  uploadZip,
  uploadPdfOrZip,
  getStatus,
  deleteQueueItem,
  getWorkerStatus,
  getMonitorEvents,
  searchImages,
  getImageUrl,
  resetSystem,
  resetMonitorEvents,
  getDoneImages,
  searchPdf,
};

export default apiService;
