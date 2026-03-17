"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CompareItem {
  id: string;
  name: string;
}

interface CompareContextValue {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  const add = useCallback((item: CompareItem) => {
    setItems((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const has = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items],
  );

  return (
    <CompareContext.Provider
      value={{ items, add, remove, clear, has, isFull: items.length >= 4 }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return ctx;
}
