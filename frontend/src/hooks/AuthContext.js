import React, { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 只在初始化時讀一次
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token'));
  const [tokenType, setTokenType] = useState(() => localStorage.getItem('token_type'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));

  // login 時立刻同步到 localStorage
  const login = ({ access_token, token_type }) => {
    // 1. 先存到 localStorage
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('token_type', token_type);
    // 2. 清除舊 Key（如有）
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenType');
    localStorage.removeItem('token');
    // 3. 再更新 state
    setAccessToken(access_token);
    setTokenType(token_type);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // 清除所有跟身份有關的 Key
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenType');
    localStorage.removeItem('token');
    setAccessToken(null);
    setTokenType(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ accessToken, tokenType, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
