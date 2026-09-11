import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
        ghost:
          "bg-transparent border-[1.5px] border-brand-500 text-brand-700 hover:bg-brand-50",
        // Never white on sand: 2.51:1 fails WCAG AA. Dark text reads and looks richer.
        sand: "bg-tertiary text-on-surface hover:bg-tertiary-hover",
        // Fill is the dark tone; white on #50a23e is 3.19:1 and fails AA.
        whatsapp:
          "bg-accent-green-dark text-white hover:bg-accent-green-darker",
        subtle:
          "bg-surface border border-surface-border text-brand-700 hover:bg-brand-50 hover:border-brand-400 shadow-2xs",
      },
      size: {
        sm: "text-[11px] px-2 py-1.5",
        md: "text-xs px-4 py-2.5",
        lg: "text-sm px-6 py-3",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
