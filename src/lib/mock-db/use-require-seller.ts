"use client";

import * as React from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuth } from "./auth-context";

export function useRequireSeller(): { ready: boolean } {
  const { user, ready: authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isSeller = Boolean(user && user.role === "seller");

  React.useEffect(() => {
    if (!authReady) return;
    if (!isSeller) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [authReady, isSeller, router, pathname]);

  return { ready: authReady && isSeller };
}
