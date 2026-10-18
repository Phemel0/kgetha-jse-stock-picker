import type { Metadata } from "next";
// Self-hosted fonts — no build-time call to Google Fonts.
// Archivo (wide) for the Kgetha wordmark and the picker; Instrument + JetBrains Mono for the landing page.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource/instrument-serif/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kgetha — JSE stock picker",
  description: "Kgetha ranks JSE shares on value, quality and momentum every trading day, and explains every pick.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
