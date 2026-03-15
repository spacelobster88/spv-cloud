import type { Vehicle } from "@/types/vehicle";
import Link from "next/link";

interface VehicleCardProps {
  vehicle: Vehicle;
}

export default function VehicleCard({ vehicle: v }: VehicleCardProps) {
  return (
    <Link
      href={`/vehicle/${v.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all"
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-[var(--color-primary)] text-base leading-snug">
            {v.name}
            <span className="text-gray-500 font-normal text-sm ml-2">
              {v.model_number}
            </span>
          </h3>
          <span className="text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded shrink-0 ml-2">
            {v.tonnage_class}
          </span>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-sm text-gray-600">
          <Spec label="品牌" value={v.brand} />
          <Spec label="类型" value={v.vehicle_type} />
          <Spec label="排放" value={v.emission_standard} />
          <Spec label="驱动" value={v.drive_type} />
          <Spec label="燃油" value={v.fuel_type} />
          <Spec
            label="总质量"
            value={v.gvw ? `${v.gvw.toLocaleString()}kg` : "-"}
          />
          <Spec
            label="功率"
            value={
              v.power_kw
                ? `${v.power_kw}kW${v.power_hp ? ` / ${v.power_hp}hp` : ""}`
                : "-"
            }
          />
          <Spec
            label="轴距"
            value={v.wheelbase ? `${v.wheelbase.toLocaleString()}mm` : "-"}
          />
          <Spec label="底盘" value={`${v.chassis_brand} ${v.chassis_model}`} />
          <Spec label="发动机" value={`${v.engine_brand} ${v.engine_model}`} />
          <Spec label="批次" value={v.announcement_batch} />
          <Spec
            label="尺寸"
            value={
              v.length && v.width && v.height
                ? `${v.length}\u00D7${v.width}\u00D7${v.height}mm`
                : "-"
            }
          />
        </div>

        {/* Tags */}
        <div className="flex gap-2 mt-3">
          {v.is_tax_exempt && <Tag text="免征" color="green" />}
          {v.is_fuel_exempt && <Tag text="燃油" color="blue" />}
          {v.is_environmental && <Tag text="环保" color="emerald" />}
        </div>
      </div>
    </Link>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-gray-400">{label}：</span>
      {value}
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${colorMap[color] || "bg-gray-100 text-gray-600"}`}
    >
      {text}
    </span>
  );
}
