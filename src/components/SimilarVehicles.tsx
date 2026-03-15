import Link from "next/link";
import type { Vehicle } from "@/types/vehicle";

/**
 * Displays a grid of 4-6 similar vehicle cards.
 *
 * Server component — no "use client" directive.
 */
export default function SimilarVehicles({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        相似车型推荐
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {vehicles.map((v) => (
          <Link
            key={v.id}
            href={`/vehicle/${v.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[#2D8CA0] hover:shadow-md transition-all overflow-hidden group"
          >
            {/* Placeholder image area */}
            <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-xs">
                {v.vehicle_type}
              </span>
            </div>

            <div className="p-3">
              <div className="font-semibold text-sm text-gray-800 truncate group-hover:text-[#2D8CA0]">
                {v.brand} {v.vehicle_type}
              </div>
              <div className="text-xs text-gray-500 truncate mt-1">
                {v.model_number}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {v.power_kw && (
                  <span className="text-xs text-gray-500">
                    {v.power_hp ?? v.power_kw}马力
                  </span>
                )}
                {v.gvw && (
                  <span className="text-xs text-gray-500">
                    {v.gvw}kg
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
