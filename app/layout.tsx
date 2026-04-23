import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAngel Sandbox",
  description: "Sandbox UI for testing the VAngel n8n agent"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
