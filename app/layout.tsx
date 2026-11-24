import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kelo-ERP | Sistem ERP UMKM Keloria",
  description:
    "Custom Micro-ERP untuk manajemen pesanan B2B Make-to-Order, ritel B2C, produksi, keuangan, dan SDM UMKM Keloria.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f6f8f7] text-slate-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
