"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { whatsappUrl } from "@/lib/whatsapp";
import { CONTACT_PHONES } from "@/lib/contact";

/**
 * Ported from code.html (floating WhatsApp button, after the footer).
 * Deliberately stays bottom-right in both locales — that is the universal
 * position users expect from WhatsApp's own chat bubble, so it is not
 * mirrored for Urdu the way directional layout is.
 *
 * Two support numbers, so this is a stack of two labeled pills rather than
 * a single icon bubble — each number is its own WhatsApp deep link.
 */
export function FloatingWhatsapp() {
  const t = useTranslations("footer");

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {CONTACT_PHONES.map((phone) => (
        <a
          key={phone.raw}
          className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold pl-3 pr-4 h-10 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          href={whatsappUrl(phone.raw, "Assalam-o-Alaikum MalakandBazar")}
          rel="noopener noreferrer"
          target="_blank"
          title={t("whatsappSupport")}
          dir="ltr"
        >
          <Icon name="chat" size={20} />
          {phone.display}
        </a>
      ))}
    </div>
  );
}
