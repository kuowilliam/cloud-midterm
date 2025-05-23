// src/components/ProtectedRoute.js

import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../hooks/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  // 未登入→導回 /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 已登入→渲染傳入的 children
  return children;
}
