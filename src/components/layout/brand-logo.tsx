import * as React from "react";

/**
 * Extracted verbatim from the Stitch export
 * (code.html:97-106), attribute names converted to JSX casing.
 */
export function BrandLogo({ className = "h-10 sm:h-12 w-auto" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 280 64" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(4, 8)">
        <path d="M4 42L18 16L32 42H4Z" fill="#1F4D3A" />
        <path d="M22 42L34 22L46 42H22Z" fill="#3F6B52" opacity="0.9" />
        <path
          d="M12 42C16 34 26 34 30 42"
          fill="none"
          stroke="#C89B6D"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <circle cx="34" cy="14" fill="#C89B6D" r="4" />
      </g>
      <text
        fill="#1F4D3A"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="-0.5"
        x="64"
        y="36"
      >
        Malakand<tspan fill="#C89B6D">Bazar</tspan>
      </text>
      <text
        fill="#3F6B52"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.5"
        x="65"
        y="50"
      >
        REGIONAL MARKETPLACE
      </text>
    </svg>
  );
}
