import Link from 'next/link';
import Logo from './Logo';

const quickLinks = [
  { href: '/search', label: '产品库' },
  { href: '/#tools', label: '工具箱' },
  { href: '/coming-soon', label: '知识库' },
  { href: '/coming-soon', label: '关于我们' },
];

const dataLinks = [
  { href: '/search', label: '公告产品数据库' },
  { href: '/coming-soon', label: '标准法规数据库' },
  { href: '/coming-soon', label: 'VIN查询' },
  { href: '/coming-soon', label: 'CCC查询' },
];

export default function Footer() {
  return (
    <footer className="bg-[#1B2B4B] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Logo size={36} />
              <div>
                <div className="text-white font-bold text-lg">专汽智云</div>
                <div className="text-xs text-gray-500">SPV Cloud</div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              一站式专用车行业数字化服务平台，助力高效查询与决策。
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-[#3AAFC9] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data links */}
          <div>
            <h3 className="text-white font-semibold mb-4">数据查询</h3>
            <ul className="space-y-2 text-sm">
              {dataLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-[#3AAFC9] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">联系我们</h3>
            <ul className="space-y-2 text-sm">
              <li>服务时间：周一至周五 9:00-18:00</li>
              <li>技术支持：support@spvcloud.com</li>
              <li>商务合作：business@spvcloud.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-xs">
          <p>&copy; 2026 专汽智云 SPV Cloud. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
