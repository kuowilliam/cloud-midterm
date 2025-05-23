// src/services/sseService.js

import { EventSourcePolyfill } from 'event-source-polyfill';

const API_URL = 'http://localhost:8000';  // 後端地址

class SSEService {
  constructor() {
    this.eventSources = {};
    this.listeners = { status: [], workerStatus: [], monitorEvents: [] };
  }

  connect(endpoint, type) {
    // 先關掉舊的
    if (this.eventSources[type]) {
      this.eventSources[type].close();
      delete this.eventSources[type];
    }

    // 立刻讀最新的兩個 key
    const token = localStorage.getItem('access_token');
    const tokenType = localStorage.getItem('token_type');
    if (!token || !tokenType) {
      console.warn('[SSE] 無法連線，找不到 token');
      return;
    }

    // 用 polyfill 版本的 EventSource
    const url = `${API_URL}${endpoint}`;
    const es = new EventSourcePolyfill(url, {
      headers: { Authorization: `${tokenType} ${token}` },
      heartbeatTimeout: 45000,
    });

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`📡 [SSE:${type}] Data received:`, {
          timestamp: new Date().toISOString(),
          type: type,
          data: data
        });
        (this.listeners[type] || []).forEach(cb => cb(data));
      } catch (err) {
        console.error(`❌ [SSE:${type}] JSON parse error:`, err);
        console.error(`❌ [SSE:${type}] Raw data:`, e.data);
      }
    };

    es.onopen = () => {
      console.log(`✅ [SSE:${type}] Connection established to ${url}`);
    };

    es.onerror = (err) => {
      console.error(`❌ [SSE:${type}] Connection error:`, {
        error: err,
        readyState: es.readyState,
        url: url,
        timestamp: new Date().toISOString()
      });
      // 關掉並 5 秒後重試
      es.close();
      delete this.eventSources[type];
      console.log(`🔄 [SSE:${type}] Will retry connection in 5 seconds...`);
      setTimeout(() => this.connect(endpoint, type), 5000);
    };

    this.eventSources[type] = es;
    return es;
  }

  disconnect(type) {
    if (this.eventSources[type]) {
      this.eventSources[type].close();
      delete this.eventSources[type];
    }
  }

  disconnectAll() {
    Object.keys(this.eventSources).forEach(t => this.disconnect(t));
  }

  addListener(type, callback) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(callback);

    if (!this.eventSources[type]) {
      if (type === 'status') this.connect('/status', 'status');
      if (type === 'workerStatus') this.connect('/monitor/worker', 'workerStatus');
      if (type === 'monitorEvents') this.connect('/monitor/events', 'monitorEvents');
    }

    // 回傳解除監聽的函式
    return () => {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
      if (this.listeners[type].length === 0) {
        this.disconnect(type);
      }
    };
  }
}

export default new SSEService();
