"use client";

import CompareBar from "./CompareBar";
import { useCompare } from "./CompareContext";

export default function CompareBarWrapper() {
  const { items, remove, clear } = useCompare();

  return <CompareBar items={items} onRemove={remove} onClear={clear} />;
}
