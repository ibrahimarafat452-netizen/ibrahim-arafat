import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CenterSettings } from '../types.ts';
import { authApi, setStoredToken, getStoredToken } from '../lib/api.ts';
import { signInWithGoogle, signOutFirebase } from '../lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  cairoToday: string;
  cairoTime: string;
  settings: CenterSettings | null;
  login: (phone: string, pass: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateLocalSettings: (s: CenterSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cairoToday, setCairoToday] = useState<string>('');
  const [cairoTime, setCairoTime] = useState<string>('');
  const [settings, setSettings] = useState<CenterSettings | null>(null);

  const refreshUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setCairoToday(data.cairoToday);
      setCairoTime(data.cairoTime);
      setSettings(data.settings);
    } catch (err) {
      console.warn('Failed to restore auth session:', err);
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (phone: string, pass: string): Promise<User> => {
    const data = await authApi.login(phone, pass);
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setCairoToday(data.cairoToday);
    setCairoTime(data.cairoTime);
    return data.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const fbUser = await signInWithGoogle();
    const data = await authApi.loginWithFirebase({
      email: fbUser.email || '',
      uid: fbUser.uid,
      name: fbUser.displayName || undefined,
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setCairoToday(data.cairoToday);
    setCairoTime(data.cairoTime);
    return data.user;
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    signOutFirebase().catch(() => {});
  };

  const updateLocalSettings = (s: CenterSettings) => {
    setSettings(s);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        cairoToday,
        cairoTime,
        settings,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
        updateLocalSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
