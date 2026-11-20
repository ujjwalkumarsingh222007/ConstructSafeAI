import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { WorkerDashboard } from '../../components/dashboard/WorkerDashboard';

export const WorkerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  return <WorkerDashboard userName={user?.first_name || 'Worker'} />;
};

export default WorkerDashboardPage;
