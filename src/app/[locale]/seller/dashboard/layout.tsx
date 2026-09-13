"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { Tabs } from "@/components/ui/tabs";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

/**
 * Seller dashboard shell.
 *
 * Access is enforced in middleware — an unauthenticated or customer account
 * is redirected before this ever renders, and every dashboard API call checks
 * the caller again server-side. The check below is only for the brief window
 * where a client-side navigation outruns the auth context, and for the case
 * where a session ends in another tab.
 */
export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("sellerDashboard");
  const common = useTranslations("common");
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isSeller = user?.role === "seller" || user?.role === "admin";

  React.useEffect(() => {
    if (ready && !isSeller) {
      router.replace(user ? "/sell" : `/sign-in?next=${encodeURIComponent(pathname ?? "")}`);
    }
  }, [ready, isSeller, user, router, pathname]);

  if (!ready || !isSeller) {
    return <FullscreenLoader label={common("loading")} />;
  }

  const activeTab = pathname?.includes("/profile")
    ? "profile"
    : pathname?.includes("/analytics")
      ? "analytics"
      : "listings";

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-on-surface">{t("title")}</h1>
      <Tabs
        value={activeTab}
        onValueChange={(value) => router.push(`/seller/dashboard/${value}`)}
        tabs={[
          { value: "listings", label: t("listingsTab"), icon: "storefront" },
          { value: "analytics", label: t("analyticsTab"), icon: "query_stats" },
          { value: "profile", label: t("profileTab"), icon: "person" },
        ]}
      />
      {children}
    </main>
  );
}
