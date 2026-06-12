import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const OWNER_ID =
  process.env.OWNER_ID ?? "00000000-0000-0000-0000-000000000001";
