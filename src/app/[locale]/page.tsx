import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-primary">
        {t("brand")}
      </h1>
      <p className="mt-1 text-sm text-on-surface-muted">{t("tagline")}</p>
    </main>
  );
}
