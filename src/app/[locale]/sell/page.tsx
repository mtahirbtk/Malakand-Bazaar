import { setRequestLocale, getTranslations } from "next-intl/server";
import { SellerRegistrationForm } from "@/components/seller/seller-registration-form";

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sellerRegistration");

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="mb-6 text-center text-xl font-extrabold tracking-tight text-on-surface">{t("pageTitle")}</h1>
      <SellerRegistrationForm />
    </main>
  );
}
