import type { Metadata } from "next";
// Self-hosted variable font (weight + width axes) — no build-time call to Google Fonts.
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kgetha — JSE stock picker",
  description: "Ranks JSE shares on value, quality and momentum, and explains every pick.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
