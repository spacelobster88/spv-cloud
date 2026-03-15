import Link from 'next/link';

export default function ComingSoonPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6 text-[#2D8CA0]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#1B2B4B] mb-3">功能开发中</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">该功能正在紧锣密鼓地开发中，敬请期待！</p>
        <Link
          href="/"
          className="inline-block bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
