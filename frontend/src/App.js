// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import sseService from './services/sseService';

import { AuthProvider } from './hooks/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import PdfSearchPage from './pages/PdfSearch';

// 1. Create the React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      staleTime: 1000,
    },
  },
});

function App() {
  // Clean up SSE connections on unmount
  useEffect(() => {
    return () => {
      sseService.disconnectAll();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/pdf-search" element={<ProtectedRoute><PdfSearchPage /></ProtectedRoute>} />
            </Routes>
          </Router>
        </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
