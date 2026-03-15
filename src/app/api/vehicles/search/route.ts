/**
 * Next.js API route: POST /api/vehicles/search
 *
 * In-memory vehicle search fallback for Vercel deployment (no FastAPI / ES).
 * Accepts the same VehicleSearchRequest body the FastAPI backend does and
 * returns a VehicleSearchResponse.
 */

import { NextRequest, NextResponse } from "next/server";
import type { VehicleSearchRequest } from "@/types/vehicle";
import { searchVehicles } from "@/lib/vehicles-data";

export async function POST(request: NextRequest) {
  try {
    const body: VehicleSearchRequest = await request.json();
    const result = searchVehicles(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body" },
      { status: 400 },
    );
  }
}

/**
 * GET handler for convenience (query-param based).
 * Converts URL search params into VehicleSearchRequest and delegates to
 * the same search engine.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const filters: Record<string, string | string[]> = {};
  const filterFields = [
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
  ];

  for (const f of filterFields) {
    const vals = sp.getAll(f);
    if (vals.length === 1) filters[f] = vals[0];
    else if (vals.length > 1) filters[f] = vals;
  }

  const ranges: Record<string, { gte?: number; lte?: number }> = {};
  const rangeFields = ["gvw", "power_kw", "wheelbase", "cargo_volume", "axle_count"];
  for (const f of rangeFields) {
    const gte = sp.get(`${f}_gte`);
    const lte = sp.get(`${f}_lte`);
    if (gte || lte) {
      ranges[f] = {};
      if (gte) ranges[f].gte = Number(gte);
      if (lte) ranges[f].lte = Number(lte);
    }
  }

  const booleans: Record<string, boolean> = {};
  if (sp.get("is_tax_exempt") === "true") booleans.is_tax_exempt = true;
  if (sp.get("is_fuel_exempt") === "true") booleans.is_fuel_exempt = true;
  if (sp.get("is_environmental") === "true") booleans.is_environmental = true;

  const req: VehicleSearchRequest = {
    query: sp.get("query") || undefined,
    filters: Object.keys(filters).length ? filters : undefined,
    ranges: Object.keys(ranges).length ? ranges : undefined,
    booleans: Object.keys(booleans).length ? booleans : undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    page_size: sp.get("page_size") ? Number(sp.get("page_size")) : 20,
    sort_by: sp.get("sort_by") || undefined,
    sort_order: (sp.get("sort_order") as "asc" | "desc") || undefined,
  };

  const result = searchVehicles(req);
  return NextResponse.json(result);
}
