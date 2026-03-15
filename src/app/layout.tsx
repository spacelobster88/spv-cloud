import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPV行业数据平台 - 专用车公告产品数据库",
  description: "专用车行业信息门户与超级工具箱，提供汽车公告产品查询、标准法规数据库、行业知识库等服务",
  keywords: "专用车,公告查询,汽车公告,专用车数据,行业数据平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="bg-blue-600 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-10 text-xs border-b border-blue-500">
          <span>SPV行业数据平台 — 专用车信息门户与超级工具箱</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-blue-200">登录</a>
            <a href="#" className="hover:text-blue-200">注册</a>
          </div>
        </div>
        {/* Main nav */}
        <nav className="flex items-center justify-between h-14">
          <a href="/" className="text-xl font-bold tracking-wide">
            🚛 SPV数据平台
          </a>
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="首页" />
            <NavLink href="/search" label="公告查询" />
            <NavLink href="#" label="免征查询" />
            <NavLink href="#" label="燃油查询" />
            <NavLink href="#" label="环保查询" />
            <NavLink href="#" label="标准法规库" />
            <NavLink href="#" label="行业知识库" />
            <NavLink href="#" label="人才培训" />
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      {label}
    </a>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h3 className="text-white font-semibold mb-3">数据查询</h3>
            <ul className="space-y-2">
              <li><a href="/search" className="hover:text-white">公告产品数据库</a></li>
              <li><a href="#" className="hover:text-white">标准法规数据库</a></li>
              <li><a href="#" className="hover:text-white">VIN查询</a></li>
              <li><a href="#" className="hover:text-white">CCC查询</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">行业服务</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">行业知识库</a></li>
              <li><a href="#" className="hover:text-white">工程常用数据</a></li>
              <li><a href="#" className="hover:text-white">运费计算器</a></li>
              <li><a href="#" className="hover:text-white">产品展示中心</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">人才与培训</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">专用车人才库</a></li>
              <li><a href="#" className="hover:text-white">在线培训</a></li>
              <li><a href="#" className="hover:text-white">专家咨询</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">关于平台</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">关于我们</a></li>
              <li><a href="#" className="hover:text-white">联系方式</a></li>
              <li><a href="#" className="hover:text-white">使用帮助</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs">
          <p>© 2024-2026 SPV行业数据平台 版权所有 | 专用车行业信息门户</p>
        </div>
      </div>
    </footer>
  );
}
