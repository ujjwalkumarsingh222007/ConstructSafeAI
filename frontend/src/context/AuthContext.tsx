import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, UserSummary } from '../api/auth';

interface AuthContextType {
  user: UserSummary | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem('cs_access_token');
    const cachedUser = localStorage.getItem('cs_user');

    if (token) {
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore cache parse error
        }
      }
      try {
        const freshUser = await authApi.getMe();
        setUser(freshUser);
        localStorage.setItem('cs_user', JSON.stringify(freshUser));
      } catch (err) {
        console.warn('Session verification notice:', err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('cs_access_token', data.tokens.access_token);
      localStorage.setItem('cs_refresh_token', data.tokens.refresh_token);
      localStorage.setItem('cs_user', JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('cs_refresh_token');
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn('Logout API call notice:', err);
    } finally {
      localStorage.removeItem('cs_access_token');
      localStorage.removeItem('cs_refresh_token');
      localStorage.removeItem('cs_user');
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const freshUser = await authApi.getMe();
      setUser(freshUser);
      localStorage.setItem('cs_user', JSON.stringify(freshUser));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
