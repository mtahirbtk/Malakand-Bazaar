import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

export function ContactActions({
  phone,
  listingTitle,
  compact = false,
  className,
}: {
  phone: string;
  listingTitle: string;
  /** Drops the call button, leaving a single full-width WhatsApp action. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button asChild variant="whatsapp" size="sm" className="flex-1">
        <a
          href={whatsappUrl(phone, `Interested in ${listingTitle}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="chat" size={15} />
          <span>{t("whatsapp")}</span>
        </a>
      </Button>
      {!compact && (
        <a
          href={`tel:${phone}`}
          aria-label={t("call")}
          title={t("call")}
          className="rounded-lg border border-surface-border p-1.5 text-primary transition-colors hover:bg-surface-low"
        >
          <Icon name="call" size={16} />
        </a>
      )}
    </div>
  );
}
