import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidMetrics — Competitive YouTube Intelligence",
  description: "Paste any YouTube channel URL. Get instant competitive intelligence — trending scores, engagement analytics, and AI-powered publishing insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
