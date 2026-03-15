import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "专汽智云 | SPV Cloud",
  description: "Special Purpose Vehicle Digital Platform",
  keywords: "专用车,公告查询,汽车公告,专用车数据,SPV Cloud,专汽智云",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="bg-[var(--color-bg-dark)] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h3 className="text-white font-semibold mb-3">数据查询</h3>
            <ul className="space-y-2">
              <li><a href="/search" className="hover:text-[var(--color-accent-light)]">公告产品数据库</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">标准法规数据库</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">VIN查询</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">CCC查询</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">行业服务</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">行业知识库</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">工程常用数据</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">运费计算器</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">产品展示中心</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">人才与培训</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">专用车人才库</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">在线培训</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">专家咨询</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">关于平台</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">关于我们</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">联系方式</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent-light)]">使用帮助</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs">
          <p>&copy; 2024-2026 专汽智云 SPV Cloud 版权所有 | Special Purpose Vehicle Digital Platform</p>
        </div>
      </div>
    </footer>
  );
}
