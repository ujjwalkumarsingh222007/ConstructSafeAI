import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Verifying Security Clearance...
        </span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_name)) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Access Restricted: Insufficient Clearance
        </h1>
        <p className="text-xs text-slate-600 mb-6">
          Your active role is <span className="font-semibold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">{user.role_name}</span>. 
          This resource strictly requires one of the following clearance levels: 
          <span className="font-mono text-brand-700 ml-1 font-bold">{allowedRoles.join(', ')}</span>.
        </p>

        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-left text-xs mb-6 text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Lock className="w-4 h-4 text-slate-500" />
            Backend RBAC Enforcement Active
          </div>
          <p className="text-[11px] text-slate-500">
            Permissions are checked cryptographically against MongoDB collections. Contact your site administrator to request elevated role privileges.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Safety Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
