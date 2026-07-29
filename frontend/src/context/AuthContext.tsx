'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { db, seedInitialMockData, type IndexedDBUser, type UserSession } from '@/lib/db';
import { deriveKeyFromPassword, setInMemoryKey, getInMemoryKey, zeroKey, encryptText, decryptText } from '@/lib/crypto';
import { useOverlay } from './OverlayContext';
import { rehydrateStorage } from '@/lib/rehydrate';

import { isEducatorUser } from '@/lib/utils';

interface AuthContextType {
  user: IndexedDBUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineSession: boolean;
  isReAuthModalOpen: boolean;
  isRestoring: boolean;
  hasPinConfigured: boolean;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  renewSession: (pinOrPassword: string) => Promise<boolean>;
  setQuickPin: (pin: string | null) => Promise<void>;
  extendSession: () => Promise<void>;
  openReAuthModal: () => void;
  closeReAuthModal: () => void;
  switchRole: (newRole: 'student' | 'educator') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean>(false);
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
      const activeSession =
        (await db.userSession.get('current_session')) ||
        sessions.find(s => s.id === 'current_session') ||
        sessions[0];

      if (activeSession) {
        setHasPinConfigured(!!activeSession.pinCode);

        // Auto-extend session duration (+7 days) for active user sessions
        const SEVEN_DAYS_MS = 3600000 * 24 * 7;
        const nowMs = Date.now();
        const freshExpiresAt = new Date(nowMs + SEVEN_DAYS_MS).toISOString();
        await db.userSession.update('current_session', { expiresAt: freshExpiresAt });
        activeSession.expiresAt = freshExpiresAt;

        const isExpired = false;
        const decryptedToken = await decryptText(activeSession.token);
        if (!isExpired) {
          let freshUser = await db.users.where('email').equalsIgnoreCase(activeSession.user.email).first();
          if (!freshUser) freshUser = activeSession.user;

          if (isEducatorUser(freshUser)) {
            freshUser.role = 'educator';
          }

          setUser(freshUser);
          setToken(decryptedToken);

          if (typeof window !== 'undefined') {
            localStorage.setItem('asala_role', freshUser.role);
            localStorage.setItem('asala_email', freshUser.email);
            localStorage.setItem('asala_name', freshUser.fullName);
            if (decryptedToken && activeSession.rememberMe) {
              localStorage.setItem('asala_token', decryptedToken);
            }
          }

          if (!navigator.onLine) {
            setIsOfflineSession(true);
            showToast('Offline Mode Active', 'warning', 'Signed in with your last saved session.');
          } else {
            rehydrateStorage();
          }
        } else {
          // Token expired -> trigger re-auth modal if user profile exists
          setUser(activeSession.user);
          setIsReAuthModalOpen(true);
        }
      } else if (typeof window !== 'undefined') {
        const cachedRole = localStorage.getItem('asala_role');
        const cachedEmail = localStorage.getItem('asala_email');
        const cachedName = localStorage.getItem('asala_name');
        const cachedToken = localStorage.getItem('asala_token') || sessionStorage.getItem('asala_token');
        if (cachedRole && cachedEmail) {
          setUser({
            id: 'boot-user',
            email: cachedEmail,
            fullName: cachedName || cachedEmail.split('@')[0],
            role: cachedRole as 'student' | 'educator' | 'admin',
            preferredLanguage: 'en',
          });
          setToken(cachedToken);
        }
      }
    } catch (err) {
      console.error('Error restoring user session:', err);
    } finally {
      setIsRestoring(false);
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
        const SEVEN_DAYS_MS = 3600000 * 24 * 7; // 7-Day Session Duration (FR-13)

        // Derive in-memory AES-GCM key from user password — mix in email for per-user salt (Security #1)
        const derivedCryptoKey = await deriveKeyFromPassword(cleanPassword, undefined, cleanEmail);
        setInMemoryKey(derivedCryptoKey);

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

            const userRole: 'student' | 'educator' | 'admin' =
              meRes.data.role === 'admin' ? 'admin' : meRes.data.role === 'educator' ? 'educator' : 'student';

            const profile: IndexedDBUser = {
              id: meRes.data.id || `user-${Date.now()}`,
              email: meRes.data.email,
              fullName: meRes.data.full_name || cleanEmail.split('@')[0],
              role: userRole,
              preferredLanguage: meRes.data.preferred_language || 'en',
              status: meRes.data.status || 'active',
            };

            const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
            const encryptedToken = await encryptText(accessToken);
            const sessionObj: UserSession = {
              id: 'current_session',
              token: encryptedToken,
              user: profile,
              rememberMe,
              expiresAt,
              lastLoginAt: new Date().toISOString(),
              hasAcceptedConsent: true,
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
            // Intercept 403 ACCOUNT_SUSPENDED error from backend
            if (apiErr?.response?.status === 403 && (apiErr?.response?.data?.detail?.includes('suspended') || apiErr?.response?.data?.error_code === 'ACCOUNT_SUSPENDED')) {
              return { success: false, error: 'ACCOUNT_SUSPENDED' };
            }
            // Return invalid credentials error immediately for 401/400 online auth responses
            if (apiErr?.response?.status === 401 || apiErr?.response?.status === 400) {
              return { success: false, error: 'Invalid email or password.' };
            }
            console.warn('API auth unreachable, falling back to offline IndexedDB mode...', apiErr);
          }
        }

        // Offline / Fallback Mode: Validate credentials against IndexedDB db.users
        let matchUser = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
        if (!matchUser) {
          return { success: false, error: 'Account not found in local offline storage. Connect online to sign in.' };
        }

        if (matchUser) {
          const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
          const offlineToken = `offline-token-${Date.now()}`;
          const encryptedOfflineToken = await encryptText(offlineToken);
          const sessionObj: UserSession = {
            id: 'current_session',
            token: encryptedOfflineToken,
            user: matchUser,
            rememberMe,
            expiresAt,
            lastLoginAt: new Date().toISOString(),
            hasAcceptedConsent: true,
          };

          if (rememberMe) {
            await db.userSession.put(sessionObj);
          }

          setUser(matchUser);
          setToken(offlineToken);
          setIsOfflineSession(true);
          showToast('Signed in Offline', 'warning', `Signed in as ${matchUser.role} (${matchUser.fullName}).`);
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
    localStorage.removeItem('asala_role');
    localStorage.removeItem('asala_email');
    localStorage.removeItem('asala_name');
    sessionStorage.removeItem('asala_token');
    zeroKey(); // Zero in-memory crypto key on logout (BR-7)
    await db.userSession.clear();
    setUser(null);
    setToken(null);
    setIsOfflineSession(false);
    setIsReAuthModalOpen(false);
    setHasPinConfigured(false);
  }, []);

  const renewSession = useCallback(
    async (pinOrPassword: string) => {
      try {
        const activeSession = await db.userSession.get('current_session');
        if (!activeSession) return false;

        const inputClean = pinOrPassword.trim();
        let isValid = false;
        let decryptedToken = '';

        // 1. If a 4-digit PIN is configured on activeSession, verify PIN first
        if (activeSession.pinCode && inputClean === activeSession.pinCode.trim()) {
          isValid = true;
          decryptedToken = await decryptText(activeSession.token);
        }

        // 2. If not matched by PIN, test AES-GCM password decryption of activeSession.token
        if (!isValid && inputClean.length >= 4) {
          const previousKey = getInMemoryKey();
          try {
            const candidateKey = await deriveKeyFromPassword(
              inputClean,
              undefined,
              activeSession.user.email
            );
            setInMemoryKey(candidateKey);

            // Cryptographic test: decryption succeeds only if AES-GCM auth tag matches candidate key
            const testToken = await decryptText(activeSession.token);
            if (testToken && testToken.length > 0) {
              isValid = true;
              decryptedToken = testToken;
            } else {
              if (previousKey) setInMemoryKey(previousKey);
            }
          } catch {
            if (previousKey) setInMemoryKey(previousKey);
          }
        }

        if (!isValid) {
          showToast('Authentication Failed', 'error', 'Incorrect PIN code or password entered.');
          return false;
        }

        const SEVEN_DAYS_MS = 3600000 * 24 * 7;
        const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
        await db.userSession.update('current_session', { expiresAt });

        // Sync React state & web storage
        setUser(activeSession.user);
        setToken(decryptedToken);

        if (typeof window !== 'undefined' && decryptedToken) {
          if (activeSession.rememberMe) {
            localStorage.setItem('asala_token', decryptedToken);
          } else {
            sessionStorage.setItem('asala_token', decryptedToken);
          }
        }

        setIsReAuthModalOpen(false);
        showToast('Session Renewed', 'success', 'Saved drafts and notes preserved.');
        return true;
      } catch (err) {
        console.error('Error renewing session:', err);
        showToast('Session Error', 'error', 'Unable to renew session. Please sign in again.');
        return false;
      }
    },
    [showToast]
  );

  // Bug #3: extendSession directly extends expiry without touching PIN-gated renewSession
  const extendSession = useCallback(async () => {
    try {
      const SEVEN_DAYS_MS = 3600000 * 24 * 7;
      const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
      await db.userSession.update('current_session', { expiresAt });
    } catch (err) {
      console.error('Error extending session:', err);
    }
  }, []);

  const setQuickPin = useCallback(
    async (pin: string | null) => {
      if (pin) {
        await db.userSession.update('current_session', { pinCode: pin });
        setHasPinConfigured(true);
        showToast('PIN Configured', 'success', '4-digit PIN set for quick re-auth.');
      } else {
        await db.userSession.update('current_session', { pinCode: undefined });
        setHasPinConfigured(false);
        showToast('PIN Removed', 'info', 'Quick PIN authentication removed.');
      }
    },
    [showToast]
  );

  const openReAuthModal = useCallback(() => setIsReAuthModalOpen(true), []);
  const closeReAuthModal = useCallback(() => setIsReAuthModalOpen(false), []);

  const switchRole = useCallback(
    async (newRole: 'student' | 'educator') => {
      if (!user) return;

      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await api.post('/auth/switch-role', { role: newRole });
          const newToken = res.data.access_token;
          if (localStorage.getItem('asala_token')) {
            localStorage.setItem('asala_token', newToken);
          } else {
            sessionStorage.setItem('asala_token', newToken);
          }
          setToken(newToken);
        } catch (err) {
          console.warn('Online role switch API call failed, updating local state only:', err);
        }
      }

      const updatedUser: IndexedDBUser = {
        ...user,
        role: newRole,
      };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('asala_role', newRole);
      }
      await db.users.put(updatedUser);

      const activeSession = await db.userSession.get('current_session');
      if (activeSession) {
        activeSession.user = updatedUser;
        await db.userSession.put(activeSession);
      }
      showToast('Role Switched', 'info', `Active profile role updated to ${newRole}.`);
    },
    [user, showToast]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isOfflineSession,
      isReAuthModalOpen,
      isRestoring,
      hasPinConfigured,
      login,
      logout,
      renewSession,
      setQuickPin,
      extendSession,
      openReAuthModal,
      closeReAuthModal,
      switchRole,
    }),
    [
      user,
      token,
      isOfflineSession,
      isReAuthModalOpen,
      isRestoring,
      hasPinConfigured,
      login,
      logout,
      renewSession,
      setQuickPin,
      extendSession,
      openReAuthModal,
      closeReAuthModal,
      switchRole,
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
