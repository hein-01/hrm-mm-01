import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAccess } from '../context/UserAccessProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('Admin' | 'Manager' | 'Employee')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = ['Admin', 'Manager', 'Employee'] }) => {
  const { currentUser } = useUserAccess();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/insights-dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
