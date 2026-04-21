import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AquaRoute Ops",
  description: "Water supply operations dashboard for owners and riders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
