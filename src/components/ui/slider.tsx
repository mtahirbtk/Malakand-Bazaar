"use client";

import * as React from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  ariaLabel,
  className,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadixSlider.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center",
        className
      )}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-neutral-200">
        <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
      </RadixSlider.Track>
      {value.map((_, i) => (
        <RadixSlider.Thumb
          key={i}
          aria-label={`${ariaLabel} ${i === 0 ? "minimum" : "maximum"}`}
          className={cn(
            "block h-4 w-4 rounded-full border-2 border-primary bg-surface shadow outline-none transition-transform",
            "hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          )}
        />
      ))}
    </RadixSlider.Root>
  );
}
