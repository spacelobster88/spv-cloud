import Link from "next/link";
import type { Metadata } from "next";
import type { Vehicle } from "@/types/vehicle";
import { allVehicles } from "@/lib/vehicles-data";
import CompareTable from "@/components/CompareTable";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "车型对比 | 专汽智云",
  description: "多车型参数对比，懂车帝风格侧对侧比较",
};

// ---------------------------------------------------------------------------
// Data fetching with backend fallback
// ---------------------------------------------------------------------------

async function fetchVehiclesForCompare(ids: string[]): Promise<Vehicle[]> {
  // Try FastAPI backend first (POST with ids array)
  try {
    const { compareVehiclesApi } = await import("@/lib/api");
    const vehicles = await compareVehiclesApi(ids);
    if (vehicles.length > 0) return vehicles;
  } catch {
    // FastAPI unavailable - fall through
  }

  // Fallback: in-memory lookup
  const vehicleMap = new Map(allVehicles.map((v) => [v.id, v]));
  const results: Vehicle[] = [];
  for (const id of ids) {
    const v = vehicleMap.get(id);
    if (v) results.push(v);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Page Component (Server Component)
// ---------------------------------------------------------------------------

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const idsParam = typeof params.ids === "string" ? params.ids : "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Not enough IDs - show empty state
  if (ids.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-[var(--color-accent)]">
            首页
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">车型对比</span>
        </nav>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4 text-gray-300">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1B2B4B] mb-2">
            请选择至少 2 款车型进行对比
          </h2>
          <p className="text-gray-500 mb-6">
            前往产品库，选择感兴趣的车型加入对比
          </p>
          <Link
            href="/search"
            className="inline-flex items-center bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            前往产品库
          </Link>
        </div>
      </div>
    );
  }

  // Cap at 4
  const limitedIds = ids.slice(0, 4);
  const vehicles = await fetchVehiclesForCompare(limitedIds);

  // Check for missing vehicles
  const foundIds = new Set(vehicles.map((v) => v.id));
  const missingIds = limitedIds.filter((id) => !foundIds.has(id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          首页
        </Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-[var(--color-accent)]">
          产品库
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">车型对比</span>
      </nav>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2B4B]">
          车型对比
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          对比 {vehicles.length} 款车型的详细参数
        </p>
      </div>

      {/* Missing vehicle warnings */}
      {missingIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 mb-4 text-sm">
          以下车型未找到：{missingIds.join("、")}
        </div>
      )}

      {/* Comparison table */}
      {vehicles.length >= 2 ? (
        <CompareTable vehicles={vehicles} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-lg mb-2">无法进行对比</div>
          <div className="text-sm">需要至少 2 款有效车型</div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link
          href="/search"
          className="text-sm text-[#2D8CA0] hover:underline"
        >
          &larr; 返回产品库
        </Link>
      </div>
    </div>
  );
}
