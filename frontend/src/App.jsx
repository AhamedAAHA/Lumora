import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'));
const CodingRound = lazy(() => import('./pages/CodingRound'));
const ReportPage = lazy(() => import('./pages/ReportPage'));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lumora-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['candidate']}>
            <CandidateDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/setup"
        element={
          <ProtectedRoute roles={['candidate']}>
            <Navigate to="/dashboard#assigned" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:sessionId"
        element={
          <ProtectedRoute roles={['candidate']}>
            <InterviewRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:sessionId/coding"
        element={
          <ProtectedRoute roles={['candidate']}>
            <CodingRound />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:reportId"
        element={
          <ProtectedRoute roles={['candidate', 'admin']}>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
