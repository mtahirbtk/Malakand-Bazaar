"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ContactActions } from "./contact-actions";

/** Solid WhatsApp-styled button; on click reveals the number directly (plain text) plus ContactActions. */
export function PhoneReveal({
  phone,
  listingTitle,
  className,
}: {
  phone: string;
  listingTitle: string;
  className?: string;
}) {
  const t = useTranslations("marketplace");
  const [revealed, setRevealed] = React.useState(false);

  if (revealed) {
    return (
      <div className={className}>
        <div dir="ltr" className="text-lg font-extrabold text-on-surface tabular">
          {phone}
        </div>
        <ContactActions phone={phone} listingTitle={listingTitle} className="mt-2" />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="whatsapp"
      className={className}
      onClick={() => setRevealed(true)}
    >
      <Icon name="chat" size={16} />
      <span>{t("showWhatsappNumber")}</span>
    </Button>
  );
}
