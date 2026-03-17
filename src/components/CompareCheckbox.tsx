"use client";

import { useCompare } from "./CompareContext";

interface CompareCheckboxProps {
  id: string;
  name: string;
}

export default function CompareCheckbox({ id, name }: CompareCheckboxProps) {
  const { add, remove, has, isFull } = useCompare();
  const checked = has(id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (checked) {
      remove(id);
    } else {
      add({ id, name });
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!checked && isFull}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
        checked
          ? "bg-[#2D8CA0] text-white border-[#2D8CA0]"
          : isFull
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-white text-gray-600 border-gray-300 hover:border-[#2D8CA0] hover:text-[#2D8CA0]"
      }`}
      title={checked ? "取消对比" : isFull ? "最多选择4款" : "加入对比"}
    >
      {checked ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {checked ? "已加入对比" : "加入对比"}
    </button>
  );
}
