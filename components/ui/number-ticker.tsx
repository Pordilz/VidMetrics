"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

function formatTickerValue(value: number, decimalPlaces: number) {
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(value.toFixed(decimalPlaces)));
}

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number; // delay in s
  decimalPlaces?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatTickerValue(direction === "down" ? value : 0, decimalPlaces);
    }
  }, [decimalPlaces, direction, value]);

  useEffect(() => {
    if (isInView) {
      const targetValue = direction === "down" ? 0 : value;
      const startTimeout = window.setTimeout(() => {
        motionValue.set(targetValue);
      }, delay * 1000);
      const settleTimeout = window.setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = formatTickerValue(targetValue, decimalPlaces);
        }
      }, delay * 1000 + 1000);

      return () => {
        window.clearTimeout(startTimeout);
        window.clearTimeout(settleTimeout);
      };
    }
  }, [motionValue, isInView, delay, value, direction, decimalPlaces]);

  useEffect(() =>
    springValue.on("change", (latest) => {
      if (ref.current) {
        const targetValue = direction === "down" ? 0 : value;
        const snapThreshold = Math.max(0.02, 1 / Math.pow(10, decimalPlaces || 0) / 2);
        const nextValue = Math.abs(targetValue - latest) < snapThreshold ? targetValue : latest;
        ref.current.textContent = formatTickerValue(nextValue, decimalPlaces);
      }
    }),
  [springValue, decimalPlaces, direction, value]);

  return (
    <span
      className={cn(
        "inline-block tabular-nums text-black dark:text-white tracking-wider",
        className,
      )}
      ref={ref}
    />
  );
}
