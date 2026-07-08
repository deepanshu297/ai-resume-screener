import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CandidateDashboard from './pages/CandidateDashboard';
import ResumeAnalysis from './pages/ResumeAnalysis';
import RecruiterDashboard from './pages/RecruiterDashboard';
import RankingPage from './pages/RankingPage';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import DashboardLayout from './components/DashboardLayout';
import { ProtectedRoutes } from './components/ProtectedRoutes';

// Layout wrapper for authenticated dashboard routes
const AuthLayout: React.FC = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Authenticated Dashboard Core */}
        <Route element={<ProtectedRoutes />}>
          <Route element={<AuthLayout />}>
            
            {/* Common Authenticated Routes */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Candidate Portal Guard */}
            <Route element={<ProtectedRoutes allowedRoles={['candidate']} />}>
              <Route path="/candidate" element={<CandidateDashboard />} />
              <Route path="/candidate/analysis" element={<ResumeAnalysis />} />
            </Route>

            {/* Recruiter Portal Guard */}
            <Route element={<ProtectedRoutes allowedRoles={['recruiter']} />}>
              <Route path="/recruiter" element={<RecruiterDashboard />} />
              <Route path="/recruiter/jobs" element={<RecruiterDashboard />} />
              <Route path="/recruiter/ranking" element={<RankingPage />} />
            </Route>

          </Route>
        </Route>

        {/* Fallback Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
