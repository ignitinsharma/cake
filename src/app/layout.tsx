import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

/*
 * RootLayout
 * App shell: Inter font, white canvas (DESIGN.md §1, §3).
 */
export const metadata: Metadata = {
  title: "Cake — Marketplace Listing Generator",
  description: "Enter product data once, generate ready-to-upload files for Indian marketplaces.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-brand-foreground">{children}</body>
    </html>
  );
}