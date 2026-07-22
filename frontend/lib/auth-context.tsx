"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredToken, setStoredToken, UserRead, UserRegister } from "./api";
import { clearUserOfflineData } from "./offline-store";

export interface UserSessionContextType {
  user: UserRead | null;
  token: string | null;
  isLoading: boolean;
}

export interface AuthActionsContextType {
  login: (email: string, password: string) => Promise<void>;
  register: (data: UserRegister) => Promise<void>;
  logout: () => void;
}

interface AuthContextType extends UserSessionContextType, AuthActionsContextType {}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount: read token from localStorage and fetch current user profile
  useEffect(() => {
    async function loadUser() {
      const storedToken = getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch (err) {
          console.error("Failed to load user profile with stored token", err);
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: UserRegister) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setToken(res.access_token);
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearUserOfflineData().catch((err) => console.error("Error clearing user offline data", err));
    setStoredToken(null);
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const sessionValue = React.useMemo(() => ({ user, token, isLoading }), [user, token, isLoading]);
  const actionsValue = React.useMemo(() => ({ login, register, logout }), []);

  return (
    <UserSessionContext.Provider value={sessionValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error("useUserSession must be used within an AuthProvider");
  }
  return context;
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error("useAuthActions must be used within an AuthProvider");
  }
  return context;
}

export function useAuth(): AuthContextType {
  const session = useUserSession();
  const actions = useAuthActions();
  return { ...session, ...actions };
}

