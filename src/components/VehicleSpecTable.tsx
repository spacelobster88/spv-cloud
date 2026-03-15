import type { Vehicle } from "@/types/vehicle";

/** A single row in a spec table: [Chinese label, display value]. */
type SpecRow = [string, string];

/** Configuration for a parameter group. */
interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

/** Format a value for display: null/undefined becomes "—". */
function fmt(value: string | number | boolean | null | undefined, suffix?: string): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (typeof value === "boolean") return value ? "\u662F" : "\u5426";
  if (suffix && typeof value === "number") return `${value} ${suffix}`;
  return String(value);
}

/** Build the 6 parameter groups from a Vehicle record. */
function buildSpecGroups(v: Vehicle): SpecGroup[] {
  return [
    {
      title: "\u57FA\u672C\u53C2\u6570",
      rows: [
        ["\u8F66\u578B\u540D\u79F0", fmt(v.name)],
        ["\u4EA7\u54C1\u5546\u6807", fmt(v.brand)],
        ["\u4F01\u4E1A\u540D\u79F0", fmt(v.manufacturer)],
        ["\u6574\u8F66\u578B\u53F7", fmt(v.model_number)],
        ["\u8F66\u8F86\u7C7B\u578B", fmt(v.vehicle_type)],
        ["\u8F66\u8F86\u7C7B\u522B", fmt(v.vehicle_category)],
        ["\u7528\u9014", fmt(v.purpose)],
        ["\u5428\u7EA7", fmt(v.tonnage_class)],
      ],
    },
    {
      title: "\u6574\u8F66\u53C2\u6570",
      rows: [
        ["\u6574\u8F66\u957F\u5EA6", fmt(v.length, "mm")],
        ["\u6574\u8F66\u5BBD\u5EA6", fmt(v.width, "mm")],
        ["\u6574\u8F66\u9AD8\u5EA6", fmt(v.height, "mm")],
        ["\u8F74\u8DDD", fmt(v.wheelbase, "mm")],
        ["\u6574\u5907\u8D28\u91CF", fmt(v.curb_weight, "kg")],
        ["\u603B\u8D28\u91CF", fmt(v.gvw, "kg")],
        ["\u8F7D\u8D28\u91CF", fmt(v.payload, "kg")],
        ["\u989D\u5B9A\u8D28\u91CF", fmt(v.rated_payload, "kg")],
      ],
    },
    {
      title: "\u5E95\u76D8\u53C2\u6570",
      rows: [
        ["\u5E95\u76D8\u5546\u6807", fmt(v.chassis_brand)],
        ["\u5E95\u76D8\u578B\u53F7", fmt(v.chassis_model)],
        ["\u9A71\u52A8\u5F62\u5F0F", fmt(v.drive_type)],
        ["\u8F74\u6570", fmt(v.axle_count)],
        ["\u8F6E\u80CE\u6570", fmt(v.tire_count)],
        ["\u8F6E\u80CE\u89C4\u683C", fmt(v.tire_spec)],
        ["\u60AC\u67B6\u5F62\u5F0F", fmt(v.suspension_type)],
      ],
    },
    {
      title: "\u53D1\u52A8\u673A\u53C2\u6570",
      rows: [
        ["\u53D1\u52A8\u673A\u54C1\u724C", fmt(v.engine_brand)],
        ["\u53D1\u52A8\u673A\u578B\u53F7", fmt(v.engine_model)],
        ["\u6392\u91CF", fmt(v.displacement, "L")],
        ["\u529F\u7387", fmt(v.power_kw, "kW")],
        ["\u9A6C\u529B", fmt(v.power_hp, "hp")],
        ["\u626D\u77E9", fmt(v.torque, "N\u00B7m")],
        ["\u6C14\u7F38\u6570", fmt(v.cylinders)],
      ],
    },
    {
      title: "\u516C\u544A\u4FE1\u606F",
      rows: [
        ["\u516C\u544A\u6279\u6B21", fmt(v.announcement_batch)],
        ["\u516C\u544A\u65E5\u671F", fmt(v.announcement_date)],
        ["\u516C\u544A\u53F7", fmt(v.certificate_number)],
        ["\u514D\u5F81\u516C\u544A", fmt(v.is_tax_exempt)],
        ["\u71C3\u6CB9\u516C\u544A", fmt(v.is_fuel_exempt)],
        ["\u73AF\u4FDD\u516C\u544A", fmt(v.is_environmental)],
      ],
    },
    {
      title: "\u5176\u4ED6\u53C2\u6570",
      rows: [
        ["\u6392\u653E\u6807\u51C6", fmt(v.emission_standard)],
        ["\u71C3\u6CB9\u7C7B\u578B", fmt(v.fuel_type)],
        ["\u71C3\u6CB9\u6D88\u8017", fmt(v.fuel_consumption, "L/100km")],
        ["\u8D27\u7BB1\u5BB9\u79EF", fmt(v.cargo_volume, "m\u00B3")],
        ["\u8D27\u7BB1\u957F\u5EA6", fmt(v.cargo_length, "mm")],
        ["\u8D27\u7BB1\u5BBD\u5EA6", fmt(v.cargo_width, "mm")],
        ["\u8D27\u7BB1\u9AD8\u5EA6", fmt(v.cargo_height, "mm")],
        ["\u5907\u6CE8", fmt(v.description)],
      ],
    },
  ];
}

/**
 * Renders all 6 parameter groups as styled tables for a vehicle.
 *
 * This is a server component — no "use client" directive.
 */
export default function VehicleSpecTable({ vehicle }: { vehicle: Vehicle }) {
  const groups = buildSpecGroups(vehicle);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groups.map((group) => (
        <div
          key={group.title}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Group header */}
          <div className="bg-[#1B2B4B] px-4 py-2.5">
            <h3 className="font-semibold text-white text-sm">{group.title}</h3>
          </div>

          {/* Rows */}
          <table className="w-full text-sm">
            <tbody>
              {group.rows.map(([label, value], i) => (
                <tr
                  key={label}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2.5 text-gray-500 w-28 border-r border-gray-100 whitespace-nowrap">
                    {label}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium break-all">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
