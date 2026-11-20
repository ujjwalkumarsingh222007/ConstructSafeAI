import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { InspectorDashboard } from '../../components/dashboard/InspectorDashboard';

export const InspectorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  return <InspectorDashboard userName={user?.first_name || 'Safety Inspector'} />;
};

export default InspectorDashboardPage;
