import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { Role } from '../../types';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children?: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser, isInitialized } = useAuthStore();
  const { t } = useLanguage();
  const location = useLocation();

  // Si está inicializando la sesión desde Supabase Auth, esperamos
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Verificación de autenticación
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Verificación de Rol (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = currentUser.role === 'super_admin' || allowedRoles.includes(currentUser.role);
    if (!hasPermission) {
      toast.error(t('toast.accessDenied'));
      return <Navigate to="/pos" replace />;
    }
  }

  return children ? children : null;
};
