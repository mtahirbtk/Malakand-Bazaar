import { setRequestLocale } from "next-intl/server";
import HomeContent from "./home-content";
import { getHomePayload } from "@/server/services/home";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const payload = await getHomePayload();

  return <HomeContent payload={payload} />;
}
