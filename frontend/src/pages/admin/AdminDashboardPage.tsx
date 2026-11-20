import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from '../../components/dashboard/AdminDashboard';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  return <AdminDashboard userName={user?.first_name || 'Admin'} />;
};

export default AdminDashboardPage;
