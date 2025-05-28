import React, { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 只在初始化時讀一次，改用 sessionStorage
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('access_token'));
  const [tokenType, setTokenType] = useState(() => sessionStorage.getItem('token_type'));
  const [username, setUsername] = useState(() => sessionStorage.getItem('username'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('access_token'));

  // login 時立刻同步到 sessionStorage
  const login = ({ access_token, token_type, username }) => {
    // 1. 先存到 sessionStorage
    sessionStorage.setItem('access_token', access_token);
    sessionStorage.setItem('token_type', token_type);
    sessionStorage.setItem('username', username);
    // 2. 清除舊 Key（如有）
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authTokenType');
    sessionStorage.removeItem('token');
    // 3. 再更新 state
    setAccessToken(access_token);
    setTokenType(token_type);
    setUsername(username);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // 清除所有跟身份有關的 Key
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authTokenType');
    sessionStorage.removeItem('token');
    setAccessToken(null);
    setTokenType(null);
    setUsername(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ accessToken, tokenType, username, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
