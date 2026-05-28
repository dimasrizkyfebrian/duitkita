"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  formatter: (n: number) => string;
  duration?: number;
  className?: string;
}

export function CountUp({ value, formatter, duration = 1.1, className }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => formatter(Math.round(v)));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    return controls.stop;
  }, [motionValue, value, duration]);

  return <motion.span className={cn(className)}>{display}</motion.span>;
}
