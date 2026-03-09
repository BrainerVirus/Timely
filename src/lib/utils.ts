import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TimeFormat } from "@/types/dashboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(value: number, format: TimeFormat = "hm"): string {
  if (format === "decimal") {
    return `${value.toFixed(1)}h`;
  }
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}
