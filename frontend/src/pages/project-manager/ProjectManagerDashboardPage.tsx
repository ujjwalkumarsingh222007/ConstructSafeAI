import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProjectManagerDashboard } from '../../components/dashboard/ProjectManagerDashboard';

export const ProjectManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  return <ProjectManagerDashboard userName={user?.first_name || 'Project Manager'} />;
};

export default ProjectManagerDashboardPage;
