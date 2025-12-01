"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class" // writes `.dark` / `.light` on <html>
      defaultTheme="system" // “device theme”
      enableSystem
      disableTransitionOnChange // prevents flashy transitions
    >
      {children}
    </NextThemesProvider>
  );
}
