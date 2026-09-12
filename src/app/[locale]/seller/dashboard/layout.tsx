"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useRequireSeller } from "@/lib/mock-db/use-require-seller";
import { Tabs } from "@/components/ui/tabs";

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("sellerDashboard");
  const { ready } = useRequireSeller();
  const pathname = usePathname();
  const router = useRouter();

  if (!ready) {
    return (
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-surface-low" />
      </main>
    );
  }

  const activeTab = pathname?.includes("/profile") ? "profile" : "listings";

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-on-surface">{t("title")}</h1>
      <Tabs
        value={activeTab}
        onValueChange={(value) => router.push(`/seller/dashboard/${value}`)}
        tabs={[
          { value: "listings", label: t("listingsTab"), icon: "storefront" },
          { value: "profile", label: t("profileTab"), icon: "person" },
        ]}
      />
      {children}
    </main>
  );
}
