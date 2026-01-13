import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Navigation from './components/Navigation';

// Page imports (will be created)
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateProject from './pages/admin/CreateProject';
import EditProject from './pages/admin/EditProject';
import SubmissionsList from './pages/admin/SubmissionsList';
import SubmissionDetail from './pages/admin/SubmissionDetail';
import HelpPage from './pages/HelpPage';

function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  
  if (auth.isBootstrapping) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }
  
  if (!auth.isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects/:code" element={<ProjectPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/help" element={<HelpPage />} />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/projects/new" element={
          <ProtectedRoute>
            <CreateProject />
          </ProtectedRoute>
        } />
        <Route path="/admin/projects/:code/edit" element={
          <ProtectedRoute>
            <EditProject />
          </ProtectedRoute>
        } />
        <Route path="/admin/projects/:code" element={
          <ProtectedRoute>
            <SubmissionsList />
          </ProtectedRoute>
        } />
        <Route path="/admin/projects/:code/submissions/:submissionId" element={
          <ProtectedRoute>
            <SubmissionDetail />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
