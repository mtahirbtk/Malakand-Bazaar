import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, dirForLocale } from "@/i18n/routing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/auth-context";
import { getServerUser } from "@/server/auth/server-user";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingWhatsapp } from "@/components/layout/floating-whatsapp";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MalakandBazaar — Regional Marketplace",
  description:
    "Buy and sell across Batkhela, Dargai and Thana Baizai. Direct contact, no commission.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  // Resolved on the server so the first paint already knows who is signed in —
  // otherwise the header flashes "Sign In" at a signed-in user on every load.
  const user = await getServerUser();

  return (
    <html lang={locale} dir={dirForLocale(locale)} className={jakarta.variable}>
      <head>
        {/* App Router has no pages/_document, so the no-page-custom-font rule does not apply. */}
        {/* display=block is deliberate: an icon font with swap/optional flashes the raw
            ligature text (the word "search") before the glyph loads. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-background font-sans text-on-surface antialiased min-h-screen flex flex-col">
        {/* Route transitions (search -> listing -> profile) hit the server for
            data with no client-side fallback UI, so without this the nav feels
            stuck. Bar fires on every push/replace, incl. the wait on server
            component data fetches. */}
        <NextTopLoader color="#2d7659" height={3} showSpinner={false} shadow={false} />
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            <ToastProvider>
              <AuthProvider initialUser={user}>
                <AnnouncementBar />
                <SiteHeader />
                {children}
                <SiteFooter />
                <FloatingWhatsapp />
              </AuthProvider>
            </ToastProvider>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
