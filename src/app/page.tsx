import Link from 'next/link';
import Logo from '@/components/Logo';
import ToolCards from '@/components/ToolCards';

const stats = [
  { label: '公告产品', value: '10,000+' },
  { label: '底盘型号', value: '2,000+' },
  { label: '品牌厂商', value: '200+' },
  { label: '日均查询', value: '5,000+' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1B2B4B] text-white py-20 md:py-28">
        {/* Geometric polygon background pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          preserveAspectRatio="none"
          viewBox="0 0 1200 600"
        >
          <polygon points="0,0 400,0 200,300" fill="#2D8CA0" />
          <polygon points="400,0 800,0 600,250" fill="#3AAFC9" />
          <polygon points="800,0 1200,0 1000,350" fill="#2D8CA0" />
          <polygon points="0,300 200,300 100,600" fill="#3AAFC9" />
          <polygon points="200,300 600,250 400,600" fill="#2D8CA0" />
          <polygon points="600,250 1000,350 800,600" fill="#3AAFC9" />
          <polygon points="1000,350 1200,0 1200,600" fill="#2D8CA0" />
        </svg>

        {/* Grid dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <Logo size={80} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-3 tracking-tight">
            专汽智云
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Special Purpose Vehicle Digital Platform
          </p>

          {/* Search bar */}
          <form action="/search" method="get" className="max-w-2xl mx-auto mb-8">
            <div className="flex bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/20">
              <input
                type="text"
                name="keyword"
                placeholder="输入车型、品牌、型号快速搜索..."
                className="flex-1 px-5 py-4 text-gray-800 text-base focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white px-8 font-semibold transition-colors flex items-center gap-2"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                搜索
              </button>
            </div>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-gray-400">热门搜索：</span>
            {['洒水车', '冷藏车', '压缩式垃圾车', '随车吊', '油罐车'].map((k) => (
              <Link
                key={k}
                href={`/search?keyword=${encodeURIComponent(k)}`}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
              >
                {k}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold text-[#2D8CA0]">{s.value}</div>
                <div className="text-gray-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Tool Cards Section */}
      <section id="tools" className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 text-[#1B2B4B]">
          快捷工具
        </h2>
        <p className="text-center text-gray-500 mb-10 max-w-lg mx-auto">
          一站式专用车行业数字化服务平台，助力高效查询与决策
        </p>
        <ToolCards />
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-[#1B2B4B] rounded-2xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none" viewBox="0 0 800 400">
            <polygon points="0,0 300,0 150,200" fill="#2D8CA0" />
            <polygon points="300,0 600,0 450,200" fill="#3AAFC9" />
            <polygon points="600,0 800,0 700,200" fill="#2D8CA0" />
          </svg>
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">开始使用公告产品数据库</h2>
            <p className="text-gray-300 mb-6">支持品牌、吨位、排放标准等多维度交叉筛选</p>
            <Link
              href="/search"
              className="inline-block bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              立即查询
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
