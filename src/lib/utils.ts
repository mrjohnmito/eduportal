import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeClassKey(value?: string | null): string {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
