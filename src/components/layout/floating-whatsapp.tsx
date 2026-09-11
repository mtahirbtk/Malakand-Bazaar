"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Ported from code.html (floating WhatsApp button, after the footer).
 * Deliberately stays bottom-right in both locales — that is the universal
 * position users expect from WhatsApp's own chat bubble, so it is not
 * mirrored for Urdu the way directional layout is.
 */
export function FloatingWhatsapp() {
  const t = useTranslations("footer");

  return (
    <a
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] hover:bg-[#20ba59] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
      href={whatsappUrl("+923166441108", "Assalam-o-Alaikum MalakandBazaar")}
      rel="noopener noreferrer"
      target="_blank"
      title={t("whatsappSupport")}
    >
      <Icon name="chat" size={28} />
    </a>
  );
}
