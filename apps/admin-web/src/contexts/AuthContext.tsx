import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, UserResponse, ApiError } from '../lib/api';
import { getToken, clearToken, isAuthenticated } from '../lib/auth';

// Define the type for the AdminRole enum from the backend
// This should match the AdminRole enum in your Prisma schema
enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER_MANAGER = 'USER_MANAGER',
  CASHIER = 'CASHIER',
  PAYMENT_COLLECTOR = 'PAYMENT_COLLECTOR',
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
    // Check if token exists and is valid (not expired)
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      // Only redirect if not already on login page or tenant pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/tenant')) {
        router.push('/login');
      }
      return;
    }

    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getMe();
      // Ensure the role is cast to AdminRole enum for type safety within the frontend
      setUser({ ...userData, role: userData.role as AdminRole });
    } catch (err) {
      console.error('Failed to fetch user in AuthProvider:', err);
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setUser(null);
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/tenant')) {
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

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, refetchUser }}>
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
