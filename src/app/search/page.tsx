import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type {
  VehicleSearchRequest,
  VehicleSearchResponse,
} from "@/types/vehicle";
import { searchVehicles } from "@/lib/vehicles-data";
import VehicleCard from "@/components/VehicleCard";
import SearchBarWrapper from "./SearchBarWrapper";
import FiltersWrapper from "./FiltersWrapper";
import PaginationWrapper from "./PaginationWrapper";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const brand = typeof params.brand === "string" ? params.brand : "";
  const vt =
    typeof params.vehicle_type === "string" ? params.vehicle_type : "";
  const query = typeof params.query === "string" ? params.query : "";
  const parts = [brand, vt, query].filter(Boolean);
  const title =
    (parts.length > 0 ? parts.join(" ") + " - " : "") +
    "公告产品查询 | 专汽智云";
  return {
    title,
    description: `查询${brand} ${vt}公告产品数据，支持多条件筛选`,
  };
}

// ---------------------------------------------------------------------------
// Helpers to parse URL params into VehicleSearchRequest
// ---------------------------------------------------------------------------

const FILTER_FIELDS = [
  "brand",
  "vehicle_type",
  "emission_standard",
  "fuel_type",
  "drive_type",
  "tonnage_class",
  "chassis_brand",
  "engine_brand",
  "announcement_batch",
  "manufacturer",
] as const;

const RANGE_FIELDS = [
  "gvw",
  "power_kw",
  "wheelbase",
  "cargo_volume",
  "axle_count",
] as const;

function buildRequest(
  params: Record<string, string | string[] | undefined>,
): VehicleSearchRequest {
  const filters: Record<string, string | string[]> = {};
  for (const f of FILTER_FIELDS) {
    const v = params[f];
    if (v) filters[f] = v;
  }

  const ranges: Record<string, { gte?: number; lte?: number }> = {};
  for (const f of RANGE_FIELDS) {
    const gteRaw = params[`${f}_gte`];
    const lteRaw = params[`${f}_lte`];
    const gte = typeof gteRaw === "string" && gteRaw ? Number(gteRaw) : undefined;
    const lte = typeof lteRaw === "string" && lteRaw ? Number(lteRaw) : undefined;
    if (gte !== undefined || lte !== undefined) {
      ranges[f] = { gte, lte };
    }
  }

  const booleans: Record<string, boolean> = {};
  if (params.is_tax_exempt === "true") booleans.is_tax_exempt = true;
  if (params.is_fuel_exempt === "true") booleans.is_fuel_exempt = true;
  if (params.is_environmental === "true") booleans.is_environmental = true;

  const queryStr =
    typeof params.query === "string" ? params.query : undefined;
  const pageStr = typeof params.page === "string" ? params.page : undefined;
  const pageSizeStr =
    typeof params.page_size === "string" ? params.page_size : undefined;

  return {
    query: queryStr || undefined,
    filters: Object.keys(filters).length ? filters : undefined,
    ranges: Object.keys(ranges).length ? ranges : undefined,
    booleans: Object.keys(booleans).length ? booleans : undefined,
    page: pageStr ? Number(pageStr) : 1,
    page_size: pageSizeStr ? Number(pageSizeStr) : 20,
  };
}

// ---------------------------------------------------------------------------
// Server-side data fetching with fallback chain
// ---------------------------------------------------------------------------

async function fetchResults(
  req: VehicleSearchRequest,
): Promise<VehicleSearchResponse> {
  // Try FastAPI backend first (uses GET with query params)
  try {
    const { searchVehiclesApi } = await import("@/lib/api");
    return await searchVehiclesApi(
      req.query,
      req.page ?? 1,
      req.page_size ?? 20,
    );
  } catch {
    // FastAPI unavailable - fall through
  }

  // Fallback: in-memory search using vehicles.json directly
  return searchVehicles(req);
}

// ---------------------------------------------------------------------------
// Page Component (Server Component - SSR for SEO)
// ---------------------------------------------------------------------------

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const req = buildRequest(params);
  const result = await fetchResults(req);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          首页
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">公告产品查询</span>
      </nav>

      {/* Search Bar */}
      <div className="mb-6">
        <Suspense>
          <SearchBarWrapper />
        </Suspense>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar: filters */}
        <aside className="lg:w-72 xl:w-80 shrink-0">
          <Suspense>
            <FiltersWrapper aggregations={result.aggregations} />
          </Suspense>
        </aside>

        {/* Center: results */}
        <div className="flex-1 min-w-0">
          {/* Result header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共找到{" "}
              <span className="text-[var(--color-accent)] font-bold text-base">
                {result.total}
              </span>{" "}
              条记录
              {req.query && (
                <span className="ml-2">
                  关键词：
                  <span className="text-orange-500">{req.query}</span>
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              第 {result.page}/{Math.ceil(result.total / result.page_size) || 1}{" "}
              页
            </div>
          </div>

          {/* Vehicle cards */}
          {result.results.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <div className="text-lg mb-2">未找到匹配的车型</div>
              <div className="text-sm">请尝试修改筛选条件或搜索关键词</div>
            </div>
          ) : (
            <div className="space-y-4">
              {result.results.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Suspense>
            <PaginationWrapper
              total={result.total}
              page={result.page}
              pageSize={result.page_size}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
