"use client";

import * as React from "react";
import { Slider } from "./slider";
import { Button } from "./button";
import { cn } from "@/lib/cn";

export function PriceRange({
  min,
  max,
  value,
  onChange,
  onApply,
  labels,
  className,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onApply: () => void;
  labels: { from: string; to: string; apply: string; highest: string };
  className?: string;
}) {
  const [low, high] = value;

  function setLow(next: number) {
    onChange([Math.min(Math.max(next, min), high), high]);
  }
  function setHigh(next: number) {
    onChange([low, Math.max(Math.min(next, max), low)]);
  }

  const fields = [
    { label: labels.from, val: low, set: setLow },
    { label: labels.to, val: high, set: setHigh },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[11px] text-on-surface-muted">
        {labels.highest}{" "}
        <span className="tabular font-semibold text-on-surface">
          Rs. {max.toLocaleString("en-US")}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="mb-0.5 block text-[10px] font-bold uppercase text-neutral-400">
              {field.label}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs text-neutral-400">₨</span>
              <input
                type="number"
                aria-label={field.label}
                value={field.val}
                onChange={(e) => field.set(Number(e.target.value || 0))}
                className="tabular w-full rounded border border-neutral-300 bg-neutral-50 py-1.5 pl-6 pr-2 text-xs font-medium focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Slider
          ariaLabel="Price"
          min={min}
          max={max}
          step={1000}
          value={[low, high]}
          onValueChange={(v) => onChange([v[0], v[1]])}
        />
        <div className="tabular flex justify-between text-[10px] text-neutral-400">
          <span>₨{min.toLocaleString("en-US")}</span>
          <span>₨{high.toLocaleString("en-US")}</span>
          <span>₨{max.toLocaleString("en-US")}</span>
        </div>
      </div>

      <Button variant="subtle" size="sm" className="w-full" onClick={onApply}>
        {labels.apply}
      </Button>
    </div>
  );
}
