import Link from 'next/link';
import Logo from '@/components/Logo';

const categories = [
  {
    title: '市政环卫车',
    items: ['洒水车', '垃圾车', '压缩式垃圾车', '吸污车', '扫路车', '清洗车'],
  },
  {
    title: '厢式专用车',
    items: ['冷藏车', '厢式运输车', '畜禽运输车', 'LED广告车', '邮政车', '售货车'],
  },
  {
    title: '危险品运输车',
    items: ['油罐车', '化工液体运输车', '爆破器材运输车', '气瓶运输车'],
  },
  {
    title: '工程物料运输车',
    items: ['随车起重运输车', '混凝土搅拌运输车', '粉粒物料运输车', '自卸车', '平板运输车'],
  },
];

const tools = [
  { title: '公告产品数据库', desc: '汽车公告产品多条件查询', href: '/search' },
  { title: '标准法规数据库', desc: '行业标准与法规文件检索', href: '#' },
  { title: '行业知识库', desc: '专用车百科与技术文档', href: '#' },
  { title: '工程常用数据', desc: '材料参数、换算工具', href: '#' },
  { title: '人才培训平台', desc: '在线课程与技能认证', href: '#' },
  { title: '产品展示中心', desc: '3D展示与参数对比', href: '#' },
];

const stats = [
  { label: '公告车型', value: '58,000+' },
  { label: '合作厂商', value: '1,200+' },
  { label: '标准法规', value: '3,500+' },
  { label: '注册用户', value: '120,000+' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero with geometric polygon background */}
      <section className="relative overflow-hidden bg-[var(--color-primary)] text-white py-20">
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
          <polygon points="0,600 400,600 800,600 1200,600 1200,600" fill="#1B2B4B" />
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <Logo size={100} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-3">
            专汽智云
          </h1>
          <p className="text-[var(--color-text-light)] text-lg mb-10 max-w-2xl mx-auto">
            Special Purpose Vehicle Digital Platform
          </p>

          {/* Quick search */}
          <form action="/search" method="get" className="max-w-2xl mx-auto mb-8">
            <div className="flex bg-white rounded-lg overflow-hidden shadow-lg">
              <input
                type="text"
                name="keyword"
                placeholder="输入车型、品牌、型号快速搜索..."
                className="flex-1 px-5 py-4 text-gray-800 text-base focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white px-8 font-semibold transition-colors"
              >
                搜索
              </button>
            </div>
          </form>

          {/* CTA button */}
          <Link
            href="/search"
            className="inline-block bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-semibold px-10 py-3.5 rounded-lg transition-colors text-lg"
          >
            立即查询
          </Link>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3 mt-8 text-sm">
            <span className="text-[var(--color-text-light)] opacity-70">热门搜索：</span>
            {['洒水车', '冷藏车', '压缩式垃圾车', '随车吊', '油罐车'].map(k => (
              <Link
                key={k}
                href={`/search?keyword=${encodeURIComponent(k)}`}
                className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full transition-colors"
              >
                {k}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-accent)]">{s.value}</div>
                <div className="text-gray-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools / Modules */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-[var(--color-primary)]">平台服务</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map(t => (
            <Link
              key={t.title}
              href={t.href}
              className="bg-white rounded-lg p-5 text-center shadow hover:shadow-md transition-shadow border border-gray-100 hover:border-[var(--color-accent)]"
            >
              <div className="font-semibold text-sm mb-1 text-[var(--color-primary)]">{t.title}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Vehicle categories */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-[var(--color-primary)]">车型分类</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map(cat => (
              <div key={cat.title} className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="bg-[var(--color-primary)] text-white p-4">
                  <span className="font-bold text-lg">{cat.title}</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(item => (
                      <Link
                        key={item}
                        href={`/search?vehicleType=${encodeURIComponent(item)}`}
                        className="text-sm text-[var(--color-accent)] hover:text-[var(--color-primary)] bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-full transition-colors"
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-[var(--color-primary)] rounded-2xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none" viewBox="0 0 800 400">
            <polygon points="0,0 300,0 150,200" fill="#2D8CA0" />
            <polygon points="300,0 600,0 450,200" fill="#3AAFC9" />
            <polygon points="600,0 800,0 700,200" fill="#2D8CA0" />
          </svg>
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">开始使用公告产品数据库</h2>
            <p className="text-[var(--color-text-light)] mb-6">支持品牌、吨位、排放标准等多维度交叉筛选</p>
            <Link
              href="/search"
              className="inline-block bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              立即查询
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
