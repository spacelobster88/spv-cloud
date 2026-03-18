/**
 * Typed fetch wrapper for the FastAPI backend (port 8321).
 *
 * - Server-side (SSR / RSC): uses the env var or localhost.
 * - Client-side (browser): uses a relative path so the Next.js rewrites
 *   proxy the request to the backend.
 */

import type { Vehicle, VehicleSearchResponse } from "@/types/vehicle";

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

/** Resolve the correct base URL depending on execution context. */
export function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.FASTAPI_URL ?? "http://localhost:8321";
  }
  return process.env.NEXT_PUBLIC_FASTAPI_URL ?? "";
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

/** Standard error shape returned by the backend. */
export interface ApiError {
  detail: string;
  status: number;
}

/** Thin wrapper around fetch with generics and automatic JSON parsing. */
export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response body was not JSON — keep statusText
    }

    const error: ApiError = { detail, status: res.status };
    throw error;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Backend → Frontend schema mapper
// ---------------------------------------------------------------------------

/**
 * Maps a raw vehicle record from the backend (which uses a different schema)
 * into the frontend's Vehicle type. Missing fields get sensible defaults.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendVehicle(raw: any): Vehicle {
  return {
    id: raw.id ?? "",
    name: raw.product_name ?? raw.common_name ?? raw.brand ?? "未知车型",
    brand: raw.brand ?? "",
    manufacturer: raw.enterprise_name ?? "",
    model_number: raw.model_number ?? "",
    announcement_batch: raw.source ?? "",
    announcement_date: null,
    vehicle_type: raw.vehicle_type ?? raw.category ?? "",
    vehicle_category: raw.category ?? "",
    purpose: raw.section ?? "",
    tonnage_class: "",
    length: null,
    width: null,
    height: null,
    wheelbase: null,
    cargo_length: null,
    cargo_width: null,
    cargo_height: null,
    cargo_volume: null,
    curb_weight: raw.curb_weight_kg ?? null,
    gvw: null,
    payload: null,
    rated_payload: null,
    max_towing_weight: null,
    chassis_brand: "",
    chassis_model: "",
    drive_type: raw.powertrain ?? "",
    axle_count: null,
    tire_count: null,
    tire_spec: "",
    suspension_type: "",
    engine_brand: "",
    engine_model: "",
    displacement: null,
    power_kw: null,
    power_hp: null,
    torque: null,
    cylinders: null,
    emission_standard: raw.emission_standard ?? "",
    fuel_type: raw.fuel_type ?? raw.powertrain ?? "",
    fuel_consumption: null,
    certificate_number: raw.catalog_number ?? "",
    is_tax_exempt: raw.source?.includes("tax") ?? false,
    is_fuel_exempt: raw.source?.includes("fuel") ?? false,
    is_environmental: false,
    images: [],
    description: raw.common_name
      ? `${raw.common_name}${raw.ev_range_km ? ` - 续航${raw.ev_range_km}km` : ""}`
      : "",
    created_at: "",
    updated_at: "",
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string }> {
  return api<{ status: string }>("/health");
}

/**
 * Search vehicles via the backend GET endpoint.
 * Converts the backend response format to VehicleSearchResponse.
 */
export async function searchVehiclesApi(
  query?: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<VehicleSearchResponse> {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  params.set("size", String(pageSize));

  const res = await fetch(`${base}/api/vehicles/search?${params}`, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    total: data.total ?? 0,
    page: data.page ?? 1,
    page_size: data.size ?? pageSize,
    results: (data.results ?? []).map(mapBackendVehicle),
  };
}

/**
 * Fetch a single vehicle by ID from the backend.
 */
export async function fetchVehicleApi(id: string): Promise<Vehicle | null> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/vehicles/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    return mapBackendVehicle(raw);
  } catch {
    return null;
  }
}

/**
 * Fetch multiple vehicles for comparison via POST /api/vehicles/compare.
 */
export async function compareVehiclesApi(ids: string[]): Promise<Vehicle[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/vehicles/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.vehicles ?? []).map(mapBackendVehicle);
}
