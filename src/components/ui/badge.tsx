import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-xs",
  {
    variants: {
      tone: {
        primary: "bg-primary text-white",
        sand: "bg-[#875520] text-white",
        green: "bg-accent-green text-white",
        neutral: "bg-brand-100 text-brand-700",
        danger: "bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "primary" },
  }
);

export function Badge({
  tone,
  icon,
  className,
  children,
}: VariantProps<typeof badgeVariants> & {
  icon?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
