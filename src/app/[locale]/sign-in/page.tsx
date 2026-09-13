import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="mb-6 text-center text-xl font-extrabold tracking-tight text-on-surface">
        {t("pageTitle")}
      </h1>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
