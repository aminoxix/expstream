import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check for user in localStorage
export const getUserFromStorage = () => {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (err) {
      console.error("Failed to parse stored user:", err);
      localStorage.removeItem("user");
    }
  }
  return null;
};
