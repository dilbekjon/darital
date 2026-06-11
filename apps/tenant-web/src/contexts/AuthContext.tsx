import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, UserResponse, ApiError } from '../lib/api';

const SESSION_REVALIDATE_INTERVAL_MS = 30000;

// Routes reachable without an authenticated session. Everything else
// (the tenant portal: /tenant, /chat, /contracts, /invoices, /payments)
// requires a valid Telegram-verified login.
const PUBLIC_PATH_PREFIXES = ['/login', '/tg-login', '/setup'];
function isPublicPath(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Define the type for the AdminRole enum from the backend
// This should match the AdminRole enum in your Prisma schema
enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  SUPPORT = 'SUPPORT',
  ANALYST = 'ANALYST',
  TENANT_USER = 'TENANT_USER',
}

interface AuthContextType {
  user: (UserResponse & { role: AdminRole }) | null;
  loading: boolean;
  hasPermission: (permissionCode: string) => boolean;
  // Add a function to refetch user if needed after role update, etc.
  refetchUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<(UserResponse & { role: AdminRole }) | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      // Redirect to login unless we're already on a public (no-auth) route
      if (!isPublicPath(window.location.pathname)) {
        router.push('/login');
      }
      return;
    }

    try {
      const userData = await getMe();
      // Ensure the role is cast to AdminRole enum for type safety within the frontend
      setUser({ ...userData, role: userData.role as AdminRole });
    } catch (err) {
      console.error('Failed to fetch user in AuthProvider:', err);
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('accessToken');
        setUser(null);
        if (!isPublicPath(window.location.pathname)) {
          router.push('/login');
        }
      } else {
        // Handle other errors, maybe show a generic error message
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const revalidate = () => {
      if (localStorage.getItem('accessToken')) {
        void fetchUser();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidate();
      }
    };

    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const intervalId = window.setInterval(revalidate, SESSION_REVALIDATE_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const hasPermission = (permissionCode: string): boolean => {
    if (loading || !user) return false;

    // SUPER_ADMIN role bypasses all permission checks
    if (user.role === AdminRole.SUPER_ADMIN) {
      return true;
    }
    
    // Tenant users have no admin permissions
    if (user.role === AdminRole.TENANT_USER) {
        return false;
    }

    return user.permissions.includes(permissionCode);
  };

  // Expose fetchUser to allow components to manually refetch user data if needed
  const refetchUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, refetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
