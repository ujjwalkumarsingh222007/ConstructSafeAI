import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClientDashboard } from '../../components/dashboard/ClientDashboard';

export const ClientDashboardPage: React.FC = () => {
  const { user } = useAuth();
  return <ClientDashboard userName={user?.first_name || 'Client'} />;
};

export default ClientDashboardPage;
