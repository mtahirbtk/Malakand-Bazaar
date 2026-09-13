"use client";

import * as React from "react";
import { api, ApiClientError } from "@/lib/api-client";

/**
 * Client-side view of who is signed in.
 *
 * The session itself lives in HttpOnly cookies the browser cannot read — this
 * is only a cache of what the server said, so nothing here is a security
 * decision. Every protected action is authorised server-side regardless of
 * what this context holds.
 *
 * The server passes `initialUser` from the root layout, so the first paint
 * already knows whether someone is signed in. Without it the header would
 * flash "Sign In" at a signed-in user on every page load.
 */

export type AuthUser = {
  id: string;
  phone: string;
  role: "customer" | "seller" | "admin";
  displayName: string;
  recoveryEmail: string | null;
  /** Undefined rather than null so `user.sellerId` reads naturally at call sites. */
  sellerId?: string;
  sellerSlug?: string;
};

type ServerUser = Omit<AuthUser, "sellerId" | "sellerSlug"> & {
  sellerId: string | null;
  sellerSlug: string | null;
};

function normalise(user: ServerUser | null): AuthUser | null {
  if (!user) return null;
  return {
    ...user,
    sellerId: user.sellerId ?? undefined,
    sellerSlug: user.sellerSlug ?? undefined,
  };
}

export type SignUpInput = { phone: string; password: string; displayName: string; turnstileToken?: string };
export type SignInInput = { phone: string; password: string };

export type RegisterSellerInput = {
  phone?: string;
  password?: string;
  turnstileToken?: string;
  storeName: string;
  description?: string;
  storePhone: string;
  tehsilSlug: string;
  localitySlug: string;
  coordinates?: { lat: number; lng: number };
  avatarPath?: string;
  bannerPath?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** False only while the very first /api/auth/me is in flight. */
  ready: boolean;
  signIn: (input: SignInInput) => Promise<AuthUser>;
  signUp: (input: SignUpInput) => Promise<AuthUser>;
  registerSeller: (input: RegisterSellerInput) => Promise<{ id: string; slug: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: ServerUser | AuthUser | null;
}) {
  const [user, setUser] = React.useState<AuthUser | null>(() =>
    initialUser ? normalise(initialUser as ServerUser) : null
  );
  const [ready, setReady] = React.useState(Boolean(initialUser));

  const refresh = React.useCallback(async () => {
    try {
      const data = await api.get<{ user: ServerUser }>("/api/auth/me");
      setUser(normalise(data.user));
    } catch (error) {
      // AUTH_REQUIRED simply means signed out — not a failure worth surfacing.
      if (!(error instanceof ApiClientError) || error.code !== "NETWORK") setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    // With a server-provided user the state is already correct; re-fetching on
    // mount would cost a request on every navigation for nothing.
    if (initialUser) {
      setReady(true);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = React.useCallback(async (input: SignInInput) => {
    const data = await api.post<{ user: ServerUser }>("/api/auth/login", input);
    const next = normalise(data.user)!;
    setUser(next);
    return next;
  }, []);

  const signUp = React.useCallback(async (input: SignUpInput) => {
    const data = await api.post<{ user: ServerUser }>("/api/auth/signup", input);
    const next = normalise(data.user)!;
    setUser(next);
    return next;
  }, []);

  const registerSeller = React.useCallback(async (input: RegisterSellerInput) => {
    const data = await api.post<{ user: ServerUser; seller: { id: string; slug: string } }>(
      "/api/seller/register",
      input
    );
    setUser(normalise(data.user));
    return data.seller;
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      // Clear locally even if the request failed: the user asked to sign out,
      // and the cookies are cleared server-side on any outcome that matters.
      setUser(null);
    }
  }, []);

  const value = React.useMemo(
    () => ({ user, ready, signIn, signUp, registerSeller, signOut, refresh }),
    [user, ready, signIn, signUp, registerSeller, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
