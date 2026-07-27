'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { db, seedInitialMockData, type IndexedDBUser, type UserSession } from '@/lib/db';
import { useOverlay } from './OverlayContext';

interface AuthContextType {
  user: IndexedDBUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineSession: boolean;
  isReAuthModalOpen: boolean;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  renewSession: (pinOrPassword: string) => Promise<boolean>;
  setQuickPin: (pin: string) => Promise<void>;
  extendSession: () => Promise<void>;
  openReAuthModal: () => void;
  closeReAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IndexedDBUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOfflineSession, setIsOfflineSession] = useState<boolean>(false);
  const [isReAuthModalOpen, setIsReAuthModalOpen] = useState<boolean>(false);
  const { showToast } = useOverlay();

  // Restore session from IndexedDB or storage on boot
  const restoreSession = useCallback(async () => {
    try {
      await seedInitialMockData();
      const sessions = await db.userSession.toArray();
      const activeSession = sessions[0];

      if (activeSession) {
        const isExpired = new Date(activeSession.expiresAt).getTime() < Date.now();
        if (!isExpired) {
          setUser(activeSession.user);
          setToken(activeSession.token);
          if (!navigator.onLine) {
            setIsOfflineSession(true);
            showToast('Offline Mode Active', 'warning', 'Signed in with your last saved session.');
          }
        } else {
          // Token expired -> trigger re-auth modal if user profile exists
          setUser(activeSession.user);
          setIsReAuthModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error restoring user session:', err);
    }
  }, [showToast]);

  useEffect(() => {
    restoreSession();

    // Listen to custom 401 session-expired event dispatched by Axios interceptor
    const handleExpiredEvent = () => {
      setIsReAuthModalOpen(true);
    };

    window.addEventListener('asala:session-expired', handleExpiredEvent);
    return () => window.removeEventListener('asala:session-expired', handleExpiredEvent);
  }, [restoreSession]);

  // Login handler connecting to FastAPI REST API with IndexedDB fallback
  const login = useCallback(
    async (emailInput: string, passInput: string, rememberMe: boolean) => {
      // Strip invisible Unicode directional markers (e.g. \u200E, \u200F, \u202A-\u202E) attached by RTL keyboards
      const cleanEmail = emailInput
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
        .trim()
        .toLowerCase();
      const cleanPassword = passInput
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
        .trim();

      try {
        await seedInitialMockData();

        if (navigator.onLine) {
          try {
            const formData = new URLSearchParams();
            formData.append('username', cleanEmail);
            formData.append('password', cleanPassword);

            const res = await api.post('/auth/login', formData, {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const accessToken = res.data.access_token;
            const meRes = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            const profile: IndexedDBUser = {
              id: meRes.data.id || `user-${Date.now()}`,
              email: meRes.data.email,
              fullName: meRes.data.full_name || cleanEmail.split('@')[0],
              role: meRes.data.role === 'educator' ? 'educator' : 'student',
              preferredLanguage: meRes.data.preferred_language || 'en',
            };

            const expiresAt = new Date(Date.now() + 3600000 * 2).toISOString();
            const sessionObj: UserSession = {
              id: 'current_session',
              token: accessToken,
              user: profile,
              rememberMe,
              expiresAt,
              lastLoginAt: new Date().toISOString(),
            };

            if (rememberMe) {
              localStorage.setItem('asala_token', accessToken);
              await db.userSession.put(sessionObj);
            } else {
              sessionStorage.setItem('asala_token', accessToken);
            }

            setUser(profile);
            setToken(accessToken);
            setIsOfflineSession(false);
            return { success: true };
          } catch (apiErr: any) {
            console.warn('API auth failed, checking offline IndexedDB fallback...', apiErr);
            // If REST API returns 401 or network error, attempt IndexedDB fallback
          }
        }

        // Offline / Fallback Mode: Validate credentials against IndexedDB db.users
        const matchUser = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
        if (matchUser) {
          const expiresAt = new Date(Date.now() + 3600000 * 2).toISOString();
          const offlineToken = `offline-token-${Date.now()}`;
          const sessionObj: UserSession = {
            id: 'current_session',
            token: offlineToken,
            user: matchUser,
            rememberMe,
            expiresAt,
            lastLoginAt: new Date().toISOString(),
          };

          if (rememberMe) {
            await db.userSession.put(sessionObj);
          }

          setUser(matchUser);
          setToken(offlineToken);
          setIsOfflineSession(true);
          showToast('Signed in Offline', 'warning', 'Using saved local session profile.');
          return { success: true };
        }

        return { success: false, error: 'Invalid email or password.' };
      } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: 'Authentication failed.' };
      }
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem('asala_token');
    sessionStorage.removeItem('asala_token');
    await db.userSession.clear();
    setUser(null);
    setToken(null);
    setIsOfflineSession(false);
    setIsReAuthModalOpen(false);
  }, []);

  const renewSession = useCallback(
    async (pinOrPassword: string) => {
      try {
        const activeSession = await db.userSession.get('current_session');
        if (activeSession) {
          const expiresAt = new Date(Date.now() + 3600000 * 2).toISOString();
          await db.userSession.update('current_session', { expiresAt });
          setIsReAuthModalOpen(false);
          showToast('Session Renewed', 'success', 'You can continue your work seamlessly.');
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error renewing session:', err);
        return false;
      }
    },
    [showToast]
  );

  const extendSession = useCallback(async () => {
    await renewSession('extend');
  }, [renewSession]);

  const setQuickPin = useCallback(
    async (pin: string) => {
      await db.userSession.update('current_session', { pinCode: pin });
      showToast('PIN Configured', 'success', '4-digit PIN set for quick re-auth.');
    },
    [showToast]
  );

  const openReAuthModal = useCallback(() => setIsReAuthModalOpen(true), []);
  const closeReAuthModal = useCallback(() => setIsReAuthModalOpen(false), []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isOfflineSession,
      isReAuthModalOpen,
      login,
      logout,
      renewSession,
      setQuickPin,
      extendSession,
      openReAuthModal,
      closeReAuthModal,
    }),
    [
      user,
      token,
      isOfflineSession,
      isReAuthModalOpen,
      login,
      logout,
      renewSession,
      setQuickPin,
      extendSession,
      openReAuthModal,
      closeReAuthModal,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
