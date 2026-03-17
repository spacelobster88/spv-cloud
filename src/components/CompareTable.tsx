"use client";

import { Fragment, useState } from "react";
import type { Vehicle } from "@/types/vehicle";

// ---------------------------------------------------------------------------
// Spec group definitions
// ---------------------------------------------------------------------------

interface SpecRow {
  label: string;
  key: keyof Vehicle;
  format?: (value: unknown) => string;
}

interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

const fmtMm = (v: unknown) =>
  v != null && v !== "" ? `${Number(v).toLocaleString()} mm` : "\u2014";
const fmtKg = (v: unknown) =>
  v != null && v !== "" ? `${Number(v).toLocaleString()} kg` : "\u2014";
const fmtM3 = (v: unknown) =>
  v != null && v !== "" ? `${v} m\u00B3` : "\u2014";
const fmtKw = (v: unknown) =>
  v != null && v !== "" ? `${v} kW` : "\u2014";
const fmtHp = (v: unknown) =>
  v != null && v !== "" ? `${v} hp` : "\u2014";
const fmtNm = (v: unknown) =>
  v != null && v !== "" ? `${v} N\u00B7m` : "\u2014";
const fmtL = (v: unknown) =>
  v != null && v !== "" ? `${v} L` : "\u2014";
const fmtFuel = (v: unknown) =>
  v != null && v !== "" ? `${v} L/100km` : "\u2014";
const fmtBool = (v: unknown) => (v === true ? "\u2713" : "\u2717");
const fmtStr = (v: unknown) =>
  v != null && v !== "" ? String(v) : "\u2014";
const fmtNum = (v: unknown) =>
  v != null && v !== "" ? String(v) : "\u2014";

const SPEC_GROUPS: SpecGroup[] = [
  {
    title: "\u57FA\u672C\u4FE1\u606F",
    rows: [
      { label: "\u8F66\u578B\u540D\u79F0", key: "name", format: fmtStr },
      { label: "\u54C1\u724C", key: "brand", format: fmtStr },
      { label: "\u751F\u4EA7\u4F01\u4E1A", key: "manufacturer", format: fmtStr },
      { label: "\u578B\u53F7", key: "model_number", format: fmtStr },
      { label: "\u516C\u544A\u6279\u6B21", key: "announcement_batch", format: fmtStr },
    ],
  },
  {
    title: "\u5C3A\u5BF8\u53C2\u6570",
    rows: [
      { label: "\u957F\u5EA6", key: "length", format: fmtMm },
      { label: "\u5BBD\u5EA6", key: "width", format: fmtMm },
      { label: "\u9AD8\u5EA6", key: "height", format: fmtMm },
      { label: "\u8F74\u8DDD", key: "wheelbase", format: fmtMm },
      { label: "\u8D27\u7BB1\u5185\u957F", key: "cargo_length", format: fmtMm },
      { label: "\u8D27\u7BB1\u5185\u5BBD", key: "cargo_width", format: fmtMm },
      { label: "\u8D27\u7BB1\u5185\u9AD8", key: "cargo_height", format: fmtMm },
      { label: "\u8D27\u7BB1\u5BB9\u79EF", key: "cargo_volume", format: fmtM3 },
    ],
  },
  {
    title: "\u91CD\u91CF\u53C2\u6570",
    rows: [
      { label: "\u6574\u5907\u8D28\u91CF", key: "curb_weight", format: fmtKg },
      { label: "\u603B\u8D28\u91CF", key: "gvw", format: fmtKg },
      { label: "\u8F7D\u8D28\u91CF", key: "payload", format: fmtKg },
      { label: "\u989D\u5B9A\u8F7D\u8D28\u91CF", key: "rated_payload", format: fmtKg },
    ],
  },
  {
    title: "\u5E95\u76D8\u53C2\u6570",
    rows: [
      { label: "\u5E95\u76D8\u54C1\u724C", key: "chassis_brand", format: fmtStr },
      { label: "\u5E95\u76D8\u578B\u53F7", key: "chassis_model", format: fmtStr },
      { label: "\u9A71\u52A8\u5F62\u5F0F", key: "drive_type", format: fmtStr },
      { label: "\u8F74\u6570", key: "axle_count", format: fmtNum },
      { label: "\u8F6E\u80CE\u6570", key: "tire_count", format: fmtNum },
      { label: "\u8F6E\u80CE\u89C4\u683C", key: "tire_spec", format: fmtStr },
      { label: "\u60AC\u67B6\u7C7B\u578B", key: "suspension_type", format: fmtStr },
    ],
  },
  {
    title: "\u52A8\u529B\u53C2\u6570",
    rows: [
      { label: "\u53D1\u52A8\u673A\u54C1\u724C", key: "engine_brand", format: fmtStr },
      { label: "\u53D1\u52A8\u673A\u578B\u53F7", key: "engine_model", format: fmtStr },
      { label: "\u6392\u91CF", key: "displacement", format: fmtL },
      { label: "\u529F\u7387 (kW)", key: "power_kw", format: fmtKw },
      { label: "\u529F\u7387 (hp)", key: "power_hp", format: fmtHp },
      { label: "\u626D\u77E9", key: "torque", format: fmtNm },
      { label: "\u6C14\u7F38\u6570", key: "cylinders", format: fmtNum },
    ],
  },
  {
    title: "\u6392\u653E\u4E0E\u71C3\u6599",
    rows: [
      { label: "\u6392\u653E\u6807\u51C6", key: "emission_standard", format: fmtStr },
      { label: "\u71C3\u6599\u7C7B\u578B", key: "fuel_type", format: fmtStr },
      { label: "\u6CB9\u8017", key: "fuel_consumption", format: fmtFuel },
    ],
  },
  {
    title: "\u653F\u7B56\u4FE1\u606F",
    rows: [
      { label: "\u514D\u5F81\u8D2D\u7F6E\u7A0E", key: "is_tax_exempt", format: fmtBool },
      { label: "\u514D\u71C3\u6CB9\u7A0E", key: "is_fuel_exempt", format: fmtBool },
      { label: "\u73AF\u4FDD\u8FBE\u6807", key: "is_environmental", format: fmtBool },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CompareTableProps {
  vehicles: Vehicle[];
}

export default function CompareTable({ vehicles }: CompareTableProps) {
  const [hideIdentical, setHideIdentical] = useState(false);

  /** Check if all vehicles have the same value for a given key. */
  const isIdentical = (key: keyof Vehicle) => {
    if (vehicles.length < 2) return true;
    const vals = vehicles.map((v) => {
      const val = v[key];
      return val != null ? String(val) : "";
    });
    return vals.every((val) => val === vals[0]);
  };

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideIdentical}
            onChange={(e) => setHideIdentical(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#2D8CA0] focus:ring-[#2D8CA0]"
          />
          隐藏相同项
        </label>
      </div>

      {/* Table wrapper for horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm min-w-[600px]">
          {/* Header with vehicle names */}
          <thead>
            <tr className="bg-[#1B2B4B] text-white">
              <th className="sticky left-0 z-10 bg-[#1B2B4B] px-4 py-3 text-left font-medium w-36 min-w-[144px]">
                参数
              </th>
              {vehicles.map((v) => (
                <th
                  key={v.id}
                  className="px-4 py-3 text-left font-medium min-w-[180px]"
                >
                  <div className="font-bold leading-snug">{v.name}</div>
                  <div className="text-white/60 font-normal text-xs mt-0.5">
                    {v.model_number}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {SPEC_GROUPS.map((group) => {
              const visibleRows = group.rows.filter(
                (row) => !(hideIdentical && isIdentical(row.key)),
              );
              if (visibleRows.length === 0) return null;

              return (
                <Fragment key={group.title}>
                  {/* Group header */}
                  <tr>
                    <td
                      colSpan={vehicles.length + 1}
                      className="bg-[#2D8CA0]/10 px-4 py-2 font-bold text-[#1B2B4B] text-sm border-t border-gray-200"
                    >
                      {group.title}
                    </td>
                  </tr>

                  {/* Spec rows */}
                  {visibleRows.map((row) => {
                    const identical = isIdentical(row.key);
                    return (
                      <tr
                        key={row.key}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-gray-500 font-medium whitespace-nowrap">
                          {row.label}
                        </td>
                        {vehicles.map((v) => {
                          const value = v[row.key];
                          const formatted = row.format
                            ? row.format(value)
                            : fmtStr(value);
                          return (
                            <td
                              key={v.id}
                              className={`px-4 py-2.5 text-gray-800 ${
                                !identical
                                  ? "bg-amber-50 font-medium"
                                  : ""
                              } ${
                                formatted === "\u2713"
                                  ? "text-green-600"
                                  : formatted === "\u2717"
                                    ? "text-red-400"
                                    : ""
                              }`}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

