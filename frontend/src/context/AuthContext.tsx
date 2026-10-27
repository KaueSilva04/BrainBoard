import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginInput, RegisterInput } from '../types';
import { authApi, setAuthToken, getAuthToken } from '../services/api';

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(getAuthToken()));

  const refreshUser = useCallback(async () => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();

    const handleUnauthorized = () => {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    };

    window.addEventListener('brainboard:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('brainboard:unauthorized', handleUnauthorized);
  }, [refreshUser]);

  const login = async (credentials: LoginInput) => {
    const res = await authApi.login(credentials);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (input: RegisterInput) => {
    const res = await authApi.register(input);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const demoLogin = async () => {
    await login({ email: 'admin@brainboard.local', password: 'brainboard123' });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
