"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { AggregationBucket } from "@/types/vehicle";

/** Filter dimension configuration. */
interface FilterDimension {
  field: string;
  label: string;
  type: "checkbox" | "range";
}

/** The 10+ faceted filter dimensions for the sidebar. */
const FILTER_DIMENSIONS: FilterDimension[] = [
  { field: "brand", label: "产品商标", type: "checkbox" },
  { field: "vehicle_type", label: "车辆类型", type: "checkbox" },
  { field: "emission_standard", label: "排放标准", type: "checkbox" },
  { field: "fuel_type", label: "燃油种类", type: "checkbox" },
  { field: "drive_type", label: "驱动形式", type: "checkbox" },
  { field: "tonnage_class", label: "吨位等级", type: "checkbox" },
  { field: "chassis_brand", label: "底盘商标", type: "checkbox" },
  { field: "engine_brand", label: "发动机品牌", type: "checkbox" },
  { field: "announcement_batch", label: "公告批次", type: "checkbox" },
  { field: "manufacturer", label: "生产企业", type: "checkbox" },
];

const RANGE_DIMENSIONS = [
  { field: "gvw", label: "总质量 (kg)" },
  { field: "power_kw", label: "功率 (kW)" },
  { field: "wheelbase", label: "轴距 (mm)" },
  { field: "cargo_volume", label: "容积 (m\u00B3)" },
  { field: "axle_count", label: "轴数" },
];

interface SearchFiltersProps {
  aggregations?: Record<string, AggregationBucket[]>;
}

export default function SearchFilters({ aggregations }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track which checkbox sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    // Expand sections that have active filters
    for (const dim of FILTER_DIMENSIONS) {
      init[dim.field] = searchParams.getAll(dim.field).length > 0;
    }
    // Always expand the first 4
    FILTER_DIMENSIONS.slice(0, 4).forEach((d) => (init[d.field] = true));
    return init;
  });

  const toggleExpanded = useCallback((field: string) => {
    setExpanded((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // Apply a checkbox filter toggle
  const toggleFilter = useCallback(
    (field: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(field);
      if (current.includes(value)) {
        params.delete(field);
        current
          .filter((v) => v !== value)
          .forEach((v) => params.append(field, v));
      } else {
        params.append(field, value);
      }
      params.set("page", "1");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Apply a range filter
  const applyRange = useCallback(
    (field: string, gte: string, lte: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (gte) params.set(`${field}_gte`, gte);
      else params.delete(`${field}_gte`);
      if (lte) params.set(`${field}_lte`, lte);
      else params.delete(`${field}_lte`);
      params.set("page", "1");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Clear all filters
  const clearAll = useCallback(() => {
    router.push("/search");
  }, [router]);

  // Boolean filter helpers
  const toggleBoolean = useCallback(
    (field: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(field) === "true") {
        params.delete(field);
      } else {
        params.set(field, "true");
      }
      params.set("page", "1");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Count active filters
  const activeCount =
    FILTER_DIMENSIONS.reduce(
      (n, d) => n + searchParams.getAll(d.field).length,
      0,
    ) +
    RANGE_DIMENSIONS.reduce((n, d) => {
      return (
        n +
        (searchParams.get(`${d.field}_gte`) ? 1 : 0) +
        (searchParams.get(`${d.field}_lte`) ? 1 : 0)
      );
    }, 0) +
    (searchParams.get("is_tax_exempt") === "true" ? 1 : 0) +
    (searchParams.get("is_fuel_exempt") === "true" ? 1 : 0) +
    (searchParams.get("is_environmental") === "true" ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">多维筛选</span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-white/70 hover:text-white transition-colors"
          >
            清空全部 ({activeCount})
          </button>
        )}
      </div>

      <div className="p-3 space-y-1 text-sm max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Checkbox filter dimensions */}
        {FILTER_DIMENSIONS.map((dim) => {
          const buckets = aggregations?.[dim.field] ?? [];
          const selected = searchParams.getAll(dim.field);
          const isExpanded = expanded[dim.field] ?? false;
          const displayBuckets = isExpanded ? buckets : buckets.slice(0, 0);

          return (
            <div key={dim.field} className="border-b border-gray-100 pb-2">
              <button
                onClick={() => toggleExpanded(dim.field)}
                className="w-full flex items-center justify-between py-2 px-1 text-gray-700 hover:text-[var(--color-primary)] font-medium"
              >
                <span>
                  {dim.label}
                  {selected.length > 0 && (
                    <span className="ml-1 text-xs text-[var(--color-accent)]">
                      ({selected.length})
                    </span>
                  )}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isExpanded && (
                <div className="pl-1 pb-1 space-y-0.5 max-h-48 overflow-y-auto">
                  {buckets.length === 0 && (
                    <div className="text-xs text-gray-400 py-1">暂无数据</div>
                  )}
                  {displayBuckets.map((bucket) => (
                    <label
                      key={bucket.key}
                      className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(bucket.key)}
                        onChange={() => toggleFilter(dim.field, bucket.key)}
                        className="rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                      />
                      <span className="flex-1 text-gray-600 text-xs truncate">
                        {bucket.key}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {bucket.doc_count}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Range filters */}
        <div className="border-b border-gray-100 pb-3 pt-2">
          <div className="text-gray-700 font-medium px-1 mb-2">参数范围</div>
          {RANGE_DIMENSIONS.map((dim) => (
            <RangeInput
              key={dim.field}
              label={dim.label}
              field={dim.field}
              gteValue={searchParams.get(`${dim.field}_gte`) ?? ""}
              lteValue={searchParams.get(`${dim.field}_lte`) ?? ""}
              onApply={applyRange}
            />
          ))}
        </div>

        {/* Boolean filters */}
        <div className="pt-2 pb-1 space-y-1">
          <div className="text-gray-700 font-medium px-1 mb-2">公告标记</div>
          <BooleanToggle
            label="免征公告"
            checked={searchParams.get("is_tax_exempt") === "true"}
            onToggle={() => toggleBoolean("is_tax_exempt")}
          />
          <BooleanToggle
            label="燃油公告"
            checked={searchParams.get("is_fuel_exempt") === "true"}
            onToggle={() => toggleBoolean("is_fuel_exempt")}
          />
          <BooleanToggle
            label="环保公告"
            checked={searchParams.get("is_environmental") === "true"}
            onToggle={() => toggleBoolean("is_environmental")}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RangeInput({
  label,
  field,
  gteValue,
  lteValue,
  onApply,
}: {
  label: string;
  field: string;
  gteValue: string;
  lteValue: string;
  onApply: (field: string, gte: string, lte: string) => void;
}) {
  const [gte, setGte] = useState(gteValue);
  const [lte, setLte] = useState(lteValue);

  return (
    <div className="mb-2 px-1">
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="最小"
          value={gte}
          onChange={(e) => setGte(e.target.value)}
          onBlur={() => onApply(field, gte, lte)}
          onKeyDown={(e) => e.key === "Enter" && onApply(field, gte, lte)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)]"
        />
        <span className="text-gray-400 text-xs">~</span>
        <input
          type="number"
          placeholder="最大"
          value={lte}
          onChange={(e) => setLte(e.target.value)}
          onBlur={() => onApply(field, gte, lte)}
          onKeyDown={(e) => e.key === "Enter" && onApply(field, gte, lte)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>
    </div>
  );
}

function BooleanToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-gray-50 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
      />
      <span className="text-gray-600 text-xs">{label}</span>
    </label>
  );
}
