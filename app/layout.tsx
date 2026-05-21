import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Markd — Smart Bookmarks",
  description: "Save, organize, and sync your bookmarks across all your tabs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
