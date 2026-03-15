import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Vehicle } from "@/types/vehicle";
import VehicleSpecTable from "@/components/VehicleSpecTable";
import SimilarVehicles from "@/components/SimilarVehicles";

// ---------------------------------------------------------------------------
// Data fetching with FastAPI -> Next.js API fallback
// ---------------------------------------------------------------------------

const FASTAPI_BASE =
  typeof window === "undefined"
    ? process.env.FASTAPI_URL ?? "http://localhost:8000"
    : "";

/** Try FastAPI first; fall back to the built-in Next.js API route. */
async function fetchVehicle(id: string): Promise<Vehicle | null> {
  // Attempt 1: FastAPI backend
  try {
    const res = await fetch(`${FASTAPI_BASE}/vehicles/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return (await res.json()) as Vehicle;
  } catch {
    // FastAPI unreachable — continue to fallback
  }

  // Attempt 2: Next.js API route (works on Vercel without FastAPI)
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const res = await fetch(`${origin}/api/vehicles/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return (await res.json()) as Vehicle;
  } catch {
    // also failed
  }

  // Attempt 3: direct file read (SSR build-time / local dev guarantee)
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "backend", "data", "vehicles.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const vehicles: Vehicle[] = JSON.parse(raw);
    return vehicles.find((v) => v.id === id) ?? null;
  } catch {
    return null;
  }
}

async function fetchSimilarVehicles(vehicle: Vehicle): Promise<Vehicle[]> {
  // Attempt 1: FastAPI
  try {
    const res = await fetch(`${FASTAPI_BASE}/vehicles/${vehicle.id}/similar`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return (await res.json()) as Vehicle[];
  } catch {
    // continue
  }

  // Attempt 2: Next.js API route
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const res = await fetch(`${origin}/api/vehicles/${vehicle.id}?similar=true`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return (await res.json()) as Vehicle[];
  } catch {
    // continue
  }

  // Attempt 3: direct file read
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "backend", "data", "vehicles.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const vehicles: Vehicle[] = JSON.parse(raw);
    return vehicles
      .filter(
        (v) =>
          v.id !== vehicle.id &&
          (v.vehicle_type === vehicle.vehicle_type || v.brand === vehicle.brand),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dynamic SEO metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await fetchVehicle(id);

  if (!vehicle) {
    return { title: "车型未找到 | 专汽智云" };
  }

  const title = `${vehicle.name} - ${vehicle.brand} ${vehicle.vehicle_type} | 专汽智云`;
  const description = [
    vehicle.name,
    vehicle.engine_brand && vehicle.engine_model
      ? `搭载${vehicle.engine_brand} ${vehicle.engine_model}发动机`
      : null,
    vehicle.power_hp ? `${vehicle.power_hp}马力` : null,
    vehicle.gvw ? `总质量${vehicle.gvw}kg` : null,
    vehicle.emission_standard ? `${vehicle.emission_standard}排放` : null,
  ]
    .filter(Boolean)
    .join("，");

  const keywords = [
    vehicle.brand,
    vehicle.vehicle_type,
    vehicle.model_number,
    vehicle.manufacturer,
    vehicle.engine_brand,
    "专用车公告",
    "专汽智云",
  ]
    .filter(Boolean)
    .join(",");

  return { title, description, keywords };
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await fetchVehicle(id);

  if (!vehicle) notFound();

  const similar = await fetchSimilarVehicles(vehicle);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4" aria-label="breadcrumb">
        <Link href="/" className="hover:text-[#2D8CA0]">
          首页
        </Link>
        <span className="mx-2">&gt;</span>
        <Link href="/search" className="hover:text-[#2D8CA0]">
          产品库
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-800">{vehicle.name}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Title bar */}
        <div className="bg-[#1B2B4B] text-white px-6 py-4">
          <h1 className="text-xl font-bold">{vehicle.name}</h1>
          <p className="text-gray-300 text-sm mt-1">
            型号：{vehicle.model_number} | 公告号：{vehicle.certificate_number}
          </p>
        </div>

        {/* Quick specs grid */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">核心参数</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <QuickSpec label="品牌" value={vehicle.brand} />
            <QuickSpec label="车辆类型" value={vehicle.vehicle_type} />
            <QuickSpec
              label="发动机"
              value={
                vehicle.engine_brand && vehicle.engine_model
                  ? `${vehicle.engine_brand} ${vehicle.engine_model}`
                  : null
              }
            />
            <QuickSpec
              label="功率"
              value={vehicle.power_hp ? `${vehicle.power_hp} hp (${vehicle.power_kw} kW)` : null}
            />
            <QuickSpec label="排放标准" value={vehicle.emission_standard} />
            <QuickSpec
              label="总质量"
              value={vehicle.gvw ? `${vehicle.gvw} kg` : null}
            />
            <QuickSpec
              label="额定质量"
              value={vehicle.rated_payload ? `${vehicle.rated_payload} kg` : null}
            />
            <QuickSpec
              label="轴距"
              value={vehicle.wheelbase ? `${vehicle.wheelbase} mm` : null}
            />
            <QuickSpec
              label="整车尺寸"
              value={
                vehicle.length && vehicle.width && vehicle.height
                  ? `${vehicle.length}x${vehicle.width}x${vehicle.height} mm`
                  : null
              }
            />
            <QuickSpec label="驱动形式" value={vehicle.drive_type} />
            <QuickSpec label="燃油类型" value={vehicle.fuel_type} />
            <QuickSpec label="吨级" value={vehicle.tonnage_class} />
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {vehicle.is_tax_exempt && (
              <span className="text-xs px-3 py-1 rounded-full border bg-green-100 text-green-700 border-green-200">
                免征公告
              </span>
            )}
            {vehicle.is_fuel_exempt && (
              <span className="text-xs px-3 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                燃油公告
              </span>
            )}
            {vehicle.is_environmental && (
              <span className="text-xs px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                环保公告
              </span>
            )}
          </div>

          {/* Description */}
          {vehicle.description && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
              <span className="font-medium text-[#1B2B4B]">简介：</span>
              {vehicle.description}
            </div>
          )}
        </div>
      </div>

      {/* Detailed parameter tables (6 groups) */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">详细参数表</h2>
        <VehicleSpecTable vehicle={vehicle} />
      </section>

      {/* Similar vehicles */}
      <SimilarVehicles vehicles={similar} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function QuickSpec({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-800 truncate">
        {value ?? "\u2014"}
      </div>
    </div>
  );
}
