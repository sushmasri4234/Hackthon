import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Navbar from './components/Navbar';

// Pages
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import BatchListPage from './pages/BatchListPage';
import NewBatchPage from './pages/NewBatchPage';
import BatchDetailPage from './pages/BatchDetailPage';

// Lazily-referenced pages (created by pages-worker; use lazy for resilience)
const ApprovalsPage = React.lazy(() => import('./pages/ApprovalsPage'));
const CertificatesPage = React.lazy(() => import('./pages/CertificatesPage'));
const AuditPage = React.lazy(() => import('./pages/AuditPage'));

// ── Loading spinner ──────────────────────────────────────────────────────────
function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '36px', height: '36px', border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// ── Layout wrapper (sidebar + topbar) ────────────────────────────────────────
function ProtectedLayout({ children, allowedRoles }: ProtectedRouteProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>
        <Navbar />
        <React.Suspense fallback={<FullPageSpinner />}>
          {children}
        </React.Suspense>
      </Layout>
    </ProtectedRoute>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/verify/:certNumber" element={<VerifyPage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        } />

        <Route path="/batches" element={
          <ProtectedLayout>
            <BatchListPage />
          </ProtectedLayout>
        } />

        <Route path="/batches/new" element={
          <ProtectedLayout allowedRoles={['TRAINING_CENTRE']}>
            <NewBatchPage />
          </ProtectedLayout>
        } />

        <Route path="/batches/:id" element={
          <ProtectedLayout>
            <BatchDetailPage />
          </ProtectedLayout>
        } />

        <Route path="/approvals" element={
          <ProtectedLayout>
            <ApprovalsPage />
          </ProtectedLayout>
        } />

        <Route path="/certificates" element={
          <ProtectedLayout>
            <CertificatesPage />
          </ProtectedLayout>
        } />

        <Route path="/audit" element={
          <ProtectedLayout allowedRoles={['STATE_OFFICE']}>
            <AuditPage />
          </ProtectedLayout>
        } />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
