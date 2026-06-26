"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

/**
 * App-wide client providers. Holds the TanStack Query client (one instance per
 * browser session via useState) — required by any client component using useQuery
 * (e.g. the notification bell, Phase 4). Server components are unaffected.
 *
 * ThemeProvider (next-themes) toggles <html class="dark"> — our globals.css defines
 * `.dark` tokens via @custom-variant. attribute="class" matches that variant;
 * defaultTheme="light" + enableSystem=false honors the design's light-default;
 * disableTransitionOnChange prevents a token-flip flash. <html suppressHydrationWarning>
 * is set in layout.tsx (next-themes requirement — it mutates the class on mount).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
