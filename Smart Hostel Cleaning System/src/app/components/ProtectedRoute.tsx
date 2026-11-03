import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

type Role = 'student' | 'staff';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role | Role[];
  authPath?: string;
  unauthorizedPath?: string;
  roleHomePaths?: Partial<Record<Role, string>>;
  loadingFallback?: React.ReactNode;
  forbiddenFallback?: React.ReactNode;
}

interface PublicOnlyRouteProps {
  children: React.ReactNode;
  roleHomePaths?: Partial<Record<Role, string>>;
  defaultPath?: string;
}

interface RoleGateProps {
  allow: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface RedirectState {
  from?: { pathname: string; search: string; hash: string };
}

type AuthShape = ReturnType<typeof useAuth> & {
  isLoading?: boolean;
  loading?: boolean;
  isInitializing?: boolean;
};

const toRoleList = (role: Role | Role[]): Role[] => (Array.isArray(role) ? role : [role]);

const useAuthStatus = () => {
  const auth = useAuth() as AuthShape;
  const pending = Boolean(auth.isLoading || auth.loading || auth.isInitializing);
  return { isAuthenticated: auth.isAuthenticated, user: auth.user, pending };
};

const DefaultLoading = () => (
  <div
    className="flex min-h-screen items-center justify-center"
    role="status"
    aria-live="polite"
    aria-label="Checking your session"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export function ProtectedRoute({
  children,
  requiredRole,
  authPath = '/auth',
  unauthorizedPath = '/',
  roleHomePaths,
  loadingFallback,
  forbiddenFallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, pending } = useAuthStatus();
  const location = useLocation();

  if (pending) {
    return <>{loadingFallback ?? <DefaultLoading />}</>;
  }

  if (!isAuthenticated) {
    const state: RedirectState = {
      from: { pathname: location.pathname, search: location.search, hash: location.hash },
    };
    return <Navigate to={authPath} state={state} replace />;
  }

  if (requiredRole) {
    const allowed = toRoleList(requiredRole);
    const role = user?.role as Role | undefined;

    if (!role || !allowed.includes(role)) {
      if (forbiddenFallback !== undefined) {
        return <>{forbiddenFallback}</>;
      }
      const target = (role && roleHomePaths?.[role]) || unauthorizedPath;
      if (target === location.pathname) {
        return <>{children}</>;
      }
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children, roleHomePaths, defaultPath = '/' }: PublicOnlyRouteProps) {
  const { isAuthenticated, user, pending } = useAuthStatus();
  const location = useLocation();

  if (pending) {
    return <DefaultLoading />;
  }

  if (isAuthenticated) {
    const from = (location.state as RedirectState | null)?.from;
    const role = user?.role as Role | undefined;
    const fallback = (role && roleHomePaths?.[role]) || defaultPath;
    const target = from ? `${from.pathname}${from.search}${from.hash}` : fallback;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { isAuthenticated, user } = useAuthStatus();
  const role = user?.role as Role | undefined;

  if (!isAuthenticated || !role || !toRoleList(allow).includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function useReturnPath(defaultPath = '/') {
  const location = useLocation();
  const from = (location.state as RedirectState | null)?.from;
  return from ? `${from.pathname}${from.search}${from.hash}` : defaultPath;
}
