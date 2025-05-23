// src/services/AuthService.js

// 因為在 package.json 已設定 proxy: "http://localhost:8000"
// 所以此處只用相對路徑
const API_ROOT = '';

const AuthService = {
  // 登入：傳 form-urlencoded，回傳後端原生欄位
  login: async (username, password) => {
    const response = await fetch(`${API_ROOT}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || '登入失敗');
    }
    const data = await response.json(); // { access_token, token_type }
    return {
      access_token: data.access_token,
      token_type: data.token_type,
    };
  },

  // 註冊：傳 JSON
  register: async (username, password) => {
    const response = await fetch(`${API_ROOT}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || '註冊失敗');
    }
    return response.json(); // e.g. { message: "Signup successful" }
  },

  // 登出：清除前端 token
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
  },
};

export default AuthService;
