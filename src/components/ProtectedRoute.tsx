import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAccess } from '../context/UserAccessProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('Admin' | 'Manager' | 'Employee')[];
  allowedPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['Admin', 'Manager', 'Employee'],
  allowedPermission
}) => {
  const { currentUser } = useUserAccess();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isDevAdmin = currentUser.id === 'EMP-001';
  const isAdmin = currentUser.role === 'Admin' || isDevAdmin;
  const hasRole = isAdmin || allowedRoles.length === 0 || allowedRoles.includes(currentUser.role);
  const hasPermission = isAdmin || !allowedPermission || (currentUser.permissions || []).includes(allowedPermission);

  if (!hasRole || !hasPermission) {
    // Redirect to home with a denial flag so the UI can show a notification
    return <Navigate to="/home" state={{ denied: true, requiredPermission: allowedPermission }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
