import Link from 'next/link';

const categories = [
  {
    title: '市政环卫车',
    icon: '🧹',
    items: ['洒水车', '垃圾车', '压缩式垃圾车', '吸污车', '扫路车', '清洗车'],
    color: 'from-green-500 to-emerald-600',
  },
  {
    title: '厢式专用车',
    icon: '📦',
    items: ['冷藏车', '厢式运输车', '畜禽运输车', 'LED广告车', '邮政车', '售货车'],
    color: 'from-blue-500 to-indigo-600',
  },
  {
    title: '危险品运输车',
    icon: '⚠️',
    items: ['油罐车', '化工液体运输车', '爆破器材运输车', '气瓶运输车'],
    color: 'from-red-500 to-rose-600',
  },
  {
    title: '工程物料运输车',
    icon: '🏗️',
    items: ['随车起重运输车', '混凝土搅拌运输车', '粉粒物料运输车', '自卸车', '平板运输车'],
    color: 'from-amber-500 to-orange-600',
  },
];

const tools = [
  { title: '公告产品数据库', desc: '汽车公告产品多条件查询', icon: '🔍', href: '/search' },
  { title: '标准法规数据库', desc: '行业标准与法规文件检索', icon: '📜', href: '#' },
  { title: '行业知识库', desc: '专用车百科与技术文档', icon: '📚', href: '#' },
  { title: '工程常用数据', desc: '材料参数、换算工具', icon: '🔢', href: '#' },
  { title: '人才培训平台', desc: '在线课程与技能认证', icon: '🎓', href: '#' },
  { title: '产品展示中心', desc: '3D展示与参数对比', icon: '🖥️', href: '#' },
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
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            专用车行业数据平台
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            汇聚公告数据、标准法规、行业知识，打造专用车信息门户与超级工具箱
          </p>
          {/* Quick search */}
          <form action="/search" method="get" className="max-w-2xl mx-auto">
            <div className="flex bg-white rounded-lg overflow-hidden shadow-lg">
              <input
                type="text"
                name="keyword"
                placeholder="输入车型、品牌、型号快速搜索..."
                className="flex-1 px-5 py-4 text-gray-800 text-base focus:outline-none"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 font-semibold transition-colors"
              >
                搜索
              </button>
            </div>
          </form>
          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm">
            <span className="text-blue-200">热门搜索：</span>
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
                <div className="text-2xl md:text-3xl font-bold text-blue-600">{s.value}</div>
                <div className="text-gray-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools / Modules */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">平台服务</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map(t => (
            <Link
              key={t.title}
              href={t.href}
              className="bg-white rounded-lg p-5 text-center shadow hover:shadow-md transition-shadow border border-gray-100 hover:border-blue-200"
            >
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="font-semibold text-sm mb-1">{t.title}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Vehicle categories */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">车型分类</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map(cat => (
              <div key={cat.title} className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className={`bg-gradient-to-r ${cat.color} text-white p-4`}>
                  <span className="text-2xl mr-2">{cat.icon}</span>
                  <span className="font-bold text-lg">{cat.title}</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(item => (
                      <Link
                        key={item}
                        href={`/search?vehicleType=${encodeURIComponent(item)}`}
                        className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">开始使用公告产品数据库</h2>
          <p className="text-blue-100 mb-6">支持品牌、吨位、排放标准等多维度交叉筛选</p>
          <Link
            href="/search"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            立即查询
          </Link>
        </div>
      </section>
    </div>
  );
}
