import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isImageSource(value?: string | null) {
  if (!value) return false;

  return /^(https?:\/\/|\/|data:image\/|blob:)/i.test(value.trim());
}
