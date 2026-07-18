"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredToken, setStoredToken, UserRead, UserRegister } from "./api";

interface AuthContextType {
  user: UserRead | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: UserRegister) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          // Token is likely invalid or expired; clear it
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
    setStoredToken(null);
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
