import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Vehicle } from "@/types/vehicle";

/** Read and cache the vehicles data from the JSON file. */
let vehiclesCache: Vehicle[] | null = null;

function loadVehicles(): Vehicle[] {
  if (vehiclesCache) return vehiclesCache;

  const filePath = path.join(process.cwd(), "backend", "data", "vehicles.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  vehiclesCache = JSON.parse(raw) as Vehicle[];
  return vehiclesCache;
}

/**
 * GET /api/vehicles/[id]
 *
 * Returns a single vehicle by ID.
 * Query param `similar=true` returns similar vehicles instead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vehicles = loadVehicles();

  const wantSimilar = request.nextUrl.searchParams.get("similar") === "true";

  if (wantSimilar) {
    // Find the source vehicle first
    const source = vehicles.find((v) => v.id === id);
    if (!source) {
      return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });
    }

    const similar = vehicles
      .filter(
        (v) =>
          v.id !== id &&
          (v.vehicle_type === source.vehicle_type || v.brand === source.brand),
      )
      .slice(0, 6);

    return NextResponse.json(similar);
  }

  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) {
    return NextResponse.json({ detail: "Vehicle not found" }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}
