"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ContactActions } from "./contact-actions";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return phone;
  return `${digits.slice(0, 4)} ${"X".repeat(digits.length - 8)} ${digits.slice(-4)}`;
}

/** Masked number behind a reveal button; reveals into the existing ContactActions. */
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
    return <ContactActions phone={phone} listingTitle={listingTitle} className={className} />;
  }

  return (
    <Button
      type="button"
      variant="subtle"
      className={className}
      onClick={() => setRevealed(true)}
    >
      <Icon name="call" size={16} />
      <span>{t("showNumber", { phone: maskPhone(phone) })}</span>
    </Button>
  );
}
