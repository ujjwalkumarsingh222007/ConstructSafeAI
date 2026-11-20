import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Lazy-loaded route views for code splitting and performance optimization
const LandingPage = React.lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Login = React.lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const PlaceholderPage = React.lazy(() => import('./pages/PlaceholderPage').then((m) => ({ default: m.PlaceholderPage })));
const ProjectList = React.lazy(() => import('./pages/projects/ProjectList').then((m) => ({ default: m.ProjectList })));
const ProjectDetail = React.lazy(() => import('./pages/projects/ProjectDetail').then((m) => ({ default: m.ProjectDetail })));
const WorkerList = React.lazy(() => import('./pages/workers/WorkerList').then((m) => ({ default: m.WorkerList })));
const WorkerProfile = React.lazy(() => import('./pages/workers/WorkerProfile').then((m) => ({ default: m.WorkerProfile })));
const InspectionList = React.lazy(() => import('./pages/inspections/InspectionList').then((m) => ({ default: m.InspectionList })));
const InspectionDetail = React.lazy(() => import('./pages/inspections/InspectionDetail').then((m) => ({ default: m.InspectionDetail })));
const IncidentList = React.lazy(() => import('./pages/incidents/IncidentList').then((m) => ({ default: m.IncidentList })));
const IncidentReport = React.lazy(() => import('./pages/incidents/IncidentReport').then((m) => ({ default: m.IncidentReport })));
const IncidentDetail = React.lazy(() => import('./pages/incidents/IncidentDetail').then((m) => ({ default: m.IncidentDetail })));
const CorrectiveActionList = React.lazy(() => import('./pages/correctiveActions/CorrectiveActionList').then((m) => ({ default: m.CorrectiveActionList })));
const HazardReportPage = React.lazy(() => import('./pages/hazards/HazardReportPage').then((m) => ({ default: m.HazardReportPage })));
const HazardListPage = React.lazy(() => import('./pages/hazards/HazardListPage').then((m) => ({ default: m.HazardListPage })));
const HazardDetailPage = React.lazy(() => import('./pages/hazards/HazardDetailPage').then((m) => ({ default: m.HazardDetailPage })));
const HazardReviewQueuePage = React.lazy(() => import('./pages/hazards/HazardReviewQueuePage').then((m) => ({ default: m.HazardReviewQueuePage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex h-64 w-full items-center justify-center text-slate-500">
    <div className="flex flex-col items-center gap-2">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-amber-600" />
      <span className="text-xs font-medium">Loading view...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Marketing & Authentication Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Enterprise Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/workers" element={<WorkerList />} />
              <Route path="/workers/me" element={<WorkerProfile />} />
              <Route path="/workers/:id" element={<WorkerProfile />} />

              {/* Phase 4: Inspections & Checklists */}
              <Route path="/inspections" element={<InspectionList />} />
              <Route path="/inspections/:id" element={<InspectionDetail />} />

              {/* Phase 4: Incident Management & Hazard Reporting */}
              <Route path="/incidents" element={<IncidentList />} />
              <Route path="/incidents/report" element={<IncidentReport />} />
              <Route path="/incidents/:id" element={<IncidentDetail />} />

              {/* Phase 5 & 6: AI-Assisted Photo Hazard Reporting & Admin Review Queue */}
              <Route path="/hazards" element={<HazardListPage />} />
              <Route path="/hazards/new" element={<HazardReportPage />} />
              <Route path="/hazards/:id" element={<HazardDetailPage />} />
              <Route
                path="/hazards/review-queue"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                    <HazardReviewQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Phase 4: Corrective Actions */}
              <Route path="/corrective-actions" element={<CorrectiveActionList />} />

              {/* Phase 7: Analytics, Safety Reporting & PDF Generation */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'super_admin', 'project_manager', 'client', 'safety_inspector']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              {/* User Center: Real-time Notifications & Role-Based Profile */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PlaceholderPage title="System Configuration & Roles" phase="Phase 2" />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
