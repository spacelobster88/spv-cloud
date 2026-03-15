/**
 * Shared vehicle data loader.
 *
 * Loads the 320 mock vehicle records from backend/data/vehicles.json
 * and provides in-memory search / filter / aggregation helpers that
 * mirror the VehicleSearchRequest / VehicleSearchResponse contracts
 * defined in @/types/vehicle.
 */

import type {
  Vehicle,
  VehicleSearchRequest,
  VehicleSearchResponse,
  AggregationBucket,
  VehicleKeywordField,
} from "@/types/vehicle";

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

import vehiclesJson from "../../backend/data/vehicles.json";

/** All 320 vehicle records, loaded once at module scope. */
export const allVehicles: Vehicle[] = vehiclesJson as unknown as Vehicle[];

// ---------------------------------------------------------------------------
// Facet fields used for sidebar aggregations
// ---------------------------------------------------------------------------

export const FACET_FIELDS: { field: VehicleKeywordField; label: string }[] = [
  { field: "brand", label: "产品商标" },
  { field: "vehicle_type", label: "车辆类型" },
  { field: "emission_standard", label: "排放标准" },
  { field: "fuel_type", label: "燃油种类" },
  { field: "drive_type", label: "驱动形式" },
  { field: "tonnage_class", label: "吨位等级" },
  { field: "chassis_brand", label: "底盘商标" },
  { field: "engine_brand", label: "发动机品牌" },
  { field: "announcement_batch", label: "公告批次" },
  { field: "manufacturer", label: "生产企业" },
];

// ---------------------------------------------------------------------------
// In-memory search engine
// ---------------------------------------------------------------------------

export function searchVehicles(
  req: VehicleSearchRequest,
): VehicleSearchResponse {
  let results = [...allVehicles];

  // -- Full-text query (Chinese keyword search) --
  if (req.query && req.query.trim()) {
    const q = req.query.trim().toLowerCase();
    results = results.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.vehicle_type.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.model_number.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q),
    );
  }

  // -- Keyword (exact-match) filters --
  if (req.filters) {
    for (const [field, value] of Object.entries(req.filters)) {
      if (value === undefined || value === null || value === "") continue;
      const vals = Array.isArray(value) ? value : [value];
      if (vals.length === 0) continue;
      results = results.filter((v) => {
        const fv = String(v[field as keyof Vehicle] ?? "");
        return vals.includes(fv);
      });
    }
  }

  // -- Numeric range filters --
  if (req.ranges) {
    for (const [field, range] of Object.entries(req.ranges)) {
      if (!range) continue;
      const { gte, lte } = range;
      results = results.filter((v) => {
        const val = v[field as keyof Vehicle] as number | null;
        if (val === null || val === undefined) return false;
        if (gte !== undefined && val < gte) return false;
        if (lte !== undefined && val > lte) return false;
        return true;
      });
    }
  }

  // -- Boolean filters --
  if (req.booleans) {
    if (req.booleans.is_tax_exempt === true)
      results = results.filter((v) => v.is_tax_exempt);
    if (req.booleans.is_fuel_exempt === true)
      results = results.filter((v) => v.is_fuel_exempt);
    if (req.booleans.is_environmental === true)
      results = results.filter((v) => v.is_environmental);
  }

  // -- Aggregations (computed AFTER filtering, for the current result set) --
  const aggregations: Record<string, AggregationBucket[]> = {};
  for (const { field } of FACET_FIELDS) {
    const counts = new Map<string, number>();
    for (const v of results) {
      const val = String(v[field as keyof Vehicle] ?? "");
      if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    aggregations[field] = Array.from(counts.entries())
      .map(([key, doc_count]) => ({ key, doc_count }))
      .sort((a, b) => b.doc_count - a.doc_count);
  }

  // -- Sorting --
  if (req.sort_by) {
    const dir = req.sort_order === "desc" ? -1 : 1;
    const sortField = req.sort_by as keyof Vehicle;
    results.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  // -- Pagination --
  const page = Math.max(1, req.page ?? 1);
  const page_size = Math.min(100, Math.max(1, req.page_size ?? 20));
  const total = results.length;
  const start = (page - 1) * page_size;
  const paged = results.slice(start, start + page_size);

  return {
    total,
    page,
    page_size,
    results: paged,
    aggregations,
  };
}
