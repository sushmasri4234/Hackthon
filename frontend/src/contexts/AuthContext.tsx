import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  trainingCentre?: { id?: string; name: string; code?: string } | null;
  district?: { id?: string; name: string } | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  districtId?: string;
  trainingCentreName?: string;
  trainingCentreCode?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      API.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const register = async (payload: RegisterPayload) => {
    const { data } = await API.post('/auth/register', payload);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  // Demo: quick switch between users (uses fixed password)
  const switchUser = async (email: string) => {
    await login(email, 'Demo@1234');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
