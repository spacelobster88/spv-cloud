import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CompareProvider } from "@/components/CompareContext";
import CompareBarWrapper from "@/components/CompareBarWrapper";

export const metadata: Metadata = {
  title: "专汽智云 | SPV Cloud",
  description: "Special Purpose Vehicle Digital Platform",
  keywords: "专用车,公告查询,汽车公告,专用车数据,SPV Cloud,专汽智云",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <CompareProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <CompareBarWrapper />
          <Footer />
        </CompareProvider>
      </body>
    </html>
  );
}
