import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { ProjectManagerDashboard } from '../components/dashboard/ProjectManagerDashboard';
import { InspectorDashboard } from '../components/dashboard/InspectorDashboard';
import { WorkerDashboard } from '../components/dashboard/WorkerDashboard';
import { ClientDashboard } from '../components/dashboard/ClientDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User';
  const role = user?.role_name || 'admin';

  switch (role) {
    case 'admin':
      return <AdminDashboard userName={userName} />;
    case 'project_manager':
      return <ProjectManagerDashboard userName={userName} />;
    case 'safety_inspector':
      return <InspectorDashboard userName={userName} />;
    case 'worker':
      return <WorkerDashboard userName={userName} />;
    case 'client':
      return <ClientDashboard userName={userName} />;
    default:
      return <AdminDashboard userName={userName} />;
  }
};

export default Dashboard;
