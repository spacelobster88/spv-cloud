"use client";

import { useRouter } from "next/navigation";

interface CompareItem {
  id: string;
  name: string;
}

interface CompareBarProps {
  items: CompareItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareBar({ items, onRemove, onClear }: CompareBarProps) {
  const router = useRouter();

  if (items.length < 2) return null;

  const handleCompare = () => {
    const ids = items.map((i) => i.id).join(",");
    router.push(`/compare?ids=${ids}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-[#1B2B4B] text-white rounded-lg shadow-2xl px-5 py-3 flex items-center gap-4">
          {/* Label */}
          <span className="text-sm text-white/70 shrink-0">
            已选 {items.length}/4
          </span>

          {/* Selected items */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded shrink-0 max-w-[160px]"
              >
                <span className="truncate">{item.name}</span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-white/60 hover:text-white ml-1 shrink-0"
                  aria-label={`Remove ${item.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClear}
              className="text-sm text-white/70 hover:text-white px-3 py-1.5 rounded transition-colors"
            >
              清空
            </button>
            <button
              onClick={handleCompare}
              className="text-sm font-semibold bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white px-5 py-1.5 rounded-lg transition-colors"
            >
              开始对比
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
