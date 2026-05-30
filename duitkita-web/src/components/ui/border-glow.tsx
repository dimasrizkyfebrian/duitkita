"use client";

import { useRef, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import "./border-glow.css";

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  edgeSensitivity?: number;
  glowColor?: string; // HSL string e.g. "270 55 72"
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: [string, string, string]; // 3 hex colors for mesh gradient
  fillOpacity?: number;
}

function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)} ${Math.round(l * 100)}`;
}

function getEdgeProximity(el: HTMLElement, x: number, y: number): number {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = Math.abs(x - cx) / (rect.width / 2);
  const dy = Math.abs(y - cy) / (rect.height / 2);
  return Math.min(Math.max(dx, dy), 1) * 100;
}

function getCursorAngle(el: HTMLElement, x: number, y: number): number {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
}

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const [h, s, l] = glowColor.split(" ");
  const base = `hsl(${h}deg ${s}% ${l}%)`;
  const pct = (p: number) => `hsl(${h}deg ${s}% ${l}% / ${(p * intensity).toFixed(2)})`;
  return {
    "--glow-color": base,
    "--glow-color-60": pct(0.6),
    "--glow-color-50": pct(0.5),
    "--glow-color-40": pct(0.4),
    "--glow-color-30": pct(0.3),
    "--glow-color-20": pct(0.2),
    "--glow-color-10": pct(0.1),
  };
}

function buildGradientVars(colors: [string, string, string]): Record<string, string> {
  const hsls = colors.map(hexToHSL);
  const positions = [
    ["80%", "55%"],
    ["69%", "34%"],
    ["8%", "6%"],
    ["41%", "38%"],
    ["86%", "85%"],
    ["82%", "18%"],
    ["51%", "4%"],
  ];
  const vars: Record<string, string> = {};
  const names = ["one", "two", "three", "four", "five", "six", "seven"];
  positions.forEach(([px, py], i) => {
    const hsl = hsls[i % hsls.length];
    const [h, s, l] = hsl.split(" ");
    vars[`--gradient-${names[i]}`] =
      `radial-gradient(at ${px} ${py}, hsla(${h}, ${s}%, ${l}%, 1) 0px, transparent 50%)`;
  });
  vars["--gradient-base"] = `linear-gradient(hsl(${hsls[0].split(" ")[0]}deg ${hsls[0].split(" ")[1]}% ${hsls[0].split(" ")[2]}%) 0 100%)`;
  return vars;
}

export function BorderGlow({
  children,
  className,
  style,
  edgeSensitivity = 30,
  glowColor = "270 55 72",
  backgroundColor = "#120F17",
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ["#c084fc", "#f472b6", "#8b5cf6"],
  fillOpacity = 0.5,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sweepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const proximity = getEdgeProximity(el, e.clientX, e.clientY);
    const angle = getCursorAngle(el, e.clientX, e.clientY);
    el.style.setProperty("--edge-proximity", String(proximity));
    el.style.setProperty("--cursor-angle", `${angle}deg`);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    // Apply static CSS custom properties
    const glowVars = buildGlowVars(glowColor, glowIntensity);
    const gradientVars = buildGradientVars(colors);
    const allVars: Record<string, string> = {
      ...glowVars,
      ...gradientVars,
      "--card-bg": backgroundColor,
      "--border-radius": `${borderRadius}px`,
      "--glow-padding": `${glowRadius}px`,
      "--edge-sensitivity": String(edgeSensitivity),
      "--color-sensitivity": String(edgeSensitivity + 20),
      "--cone-spread": String(coneSpread),
      "--fill-opacity": String(fillOpacity),
    };
    for (const [k, v] of Object.entries(allVars)) {
      el.style.setProperty(k, v);
    }

    window.addEventListener("pointermove", handlePointerMove);

    if (animated) {
      el.classList.add("sweep-active");
      sweepTimeoutRef.current = setTimeout(() => {
        el.classList.remove("sweep-active");
      }, 1200);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (sweepTimeoutRef.current) clearTimeout(sweepTimeoutRef.current);
    };
  }, [glowColor, glowIntensity, colors, backgroundColor, borderRadius, glowRadius, edgeSensitivity, coneSpread, fillOpacity, animated, handlePointerMove]);

  return (
    <div
      ref={cardRef}
      className={`border-glow-card ${className ?? ""}`}
      style={style}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">
        {children}
      </div>
    </div>
  );
}
