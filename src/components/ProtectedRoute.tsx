import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m1-10V9a3 3 0 00-3-3H6a3 3 0 00-3 3v2a3 3 0 003 3h12a3 3 0 003-3V9a3 3 0 00-3-3h-1a3 3 0 00-3 3v0" />
      </svg>
    </div>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
    <p className="text-slate-500 max-w-xs">You don't have permission to view this page. Contact your administrator for access.</p>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && auth.role !== 'admin') {
    return <AccessDenied />;
  }

  return <>{children}</>;
};
