"use client";

import { Context, useContext } from "react";

/**
 * Safely consume a React context that may not have a provider.
 * Returns the context value or a fallback when the provider is absent.
 */
export function useSafeContext<T>(
  context: Context<T | null>,
  fallbackValue: T | null = null,
): T | null {
  const value = useContext(context);
  return value ?? fallbackValue;
}
