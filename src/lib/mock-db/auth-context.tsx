"use client";

import * as React from "react";
import type { User } from "@/types";
import * as authLib from "./auth";
import type { AuthResult, RegisterSellerInput, RegisterSellerResult } from "./auth";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (phone: string, password: string) => AuthResult;
  signupCustomer: (phone: string, password: string, displayName: string) => AuthResult;
  registerSeller: (input: RegisterSellerInput) => RegisterSellerResult;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setUser(authLib.getCurrentUser());
    setReady(true);
  }, []);

  const login = React.useCallback((phone: string, password: string) => {
    const result = authLib.login(phone, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const signupCustomer = React.useCallback(
    (phone: string, password: string, displayName: string) => {
      const result = authLib.signupCustomer(phone, password, displayName);
      if (result.ok) setUser(result.user);
      return result;
    },
    []
  );

  const registerSeller = React.useCallback((input: RegisterSellerInput) => {
    const result = authLib.registerSeller(input);
    if (result.ok) setUser(authLib.getCurrentUser());
    return result;
  }, []);

  const logout = React.useCallback(() => {
    authLib.logout();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, ready, login, signupCustomer, registerSeller, logout }),
    [user, ready, login, signupCustomer, registerSeller, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
