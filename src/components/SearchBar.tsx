"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, type FormEvent } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("query", query.trim());
      } else {
        params.delete("query");
      }
      params.set("page", "1");
      router.push(`/search?${params.toString()}`);
    },
    [query, searchParams, router],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-stretch shadow-sm rounded-lg overflow-hidden border border-gray-200 focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] transition-all">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入车型、品牌、型号搜索..."
          className="flex-1 px-4 py-3 text-sm outline-none bg-white"
        />
        <button
          type="submit"
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white px-6 font-medium text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          搜索
        </button>
      </div>
    </form>
  );
}
