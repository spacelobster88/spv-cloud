/**
 * Vehicle announcement (公告产品) data model.
 *
 * These types mirror the Elasticsearch index mapping defined in
 * backend/es_mappings/vehicle_index.json.
 */

// ---------------------------------------------------------------------------
// Core vehicle document
// ---------------------------------------------------------------------------

export interface Vehicle {
  /** Unique identifier (ES document _id) */
  id: string;

  // -- 基本信息 (Basic Information) ------------------------------------------
  /** Full vehicle name / title */
  name: string;
  /** Brand name (e.g. 解放, 东风, 福田) */
  brand: string;
  /** Manufacturer / OEM */
  manufacturer: string;
  /** Official model number */
  model_number: string;
  /** Announcement batch identifier */
  announcement_batch: string;
  /** Announcement publication date (ISO date string) */
  announcement_date: string | null;

  // -- 车辆分类 (Vehicle Classification) -------------------------------------
  /** Vehicle type (e.g. 载货汽车, 牵引汽车, 自卸汽车) */
  vehicle_type: string;
  /** Vehicle category code */
  vehicle_category: string;
  /** Intended purpose / use case */
  purpose: string;
  /** Tonnage class (e.g. 轻型, 中型, 重型) */
  tonnage_class: string;

  // -- 尺寸参数 (Dimensions, mm unless noted) ---------------------------------
  /** Overall length (mm) */
  length: number | null;
  /** Overall width (mm) */
  width: number | null;
  /** Overall height (mm) */
  height: number | null;
  /** Wheelbase (mm) */
  wheelbase: number | null;
  /** Cargo box interior length (mm) */
  cargo_length: number | null;
  /** Cargo box interior width (mm) */
  cargo_width: number | null;
  /** Cargo box interior height (mm) */
  cargo_height: number | null;
  /** Cargo box volume (m³) */
  cargo_volume: number | null;

  // -- 重量参数 (Weight Specs, kg) -------------------------------------------
  /** Curb weight / unladen mass (kg) */
  curb_weight: number | null;
  /** Gross Vehicle Weight / 总质量 (kg) */
  gvw: number | null;
  /** Payload capacity (kg) */
  payload: number | null;
  /** Rated payload (kg) */
  rated_payload: number | null;
  /** Maximum towing weight (kg) */
  max_towing_weight: number | null;

  // -- 底盘参数 (Chassis Specs) ----------------------------------------------
  /** Chassis brand */
  chassis_brand: string;
  /** Chassis model number */
  chassis_model: string;
  /** Drive type (e.g. 4x2, 6x4, 8x4) */
  drive_type: string;
  /** Number of axles */
  axle_count: number | null;
  /** Number of tires */
  tire_count: number | null;
  /** Tire specification (e.g. 12R22.5) */
  tire_spec: string;
  /** Suspension type */
  suspension_type: string;

  // -- 发动机参数 (Engine Specs) ----------------------------------------------
  /** Engine manufacturer / brand */
  engine_brand: string;
  /** Engine model identifier */
  engine_model: string;
  /** Engine displacement (L) */
  displacement: number | null;
  /** Engine power (kW) */
  power_kw: number | null;
  /** Engine power (horsepower) */
  power_hp: number | null;
  /** Peak torque (N·m) */
  torque: number | null;
  /** Number of cylinders */
  cylinders: number | null;

  // -- 排放与燃油 (Emission & Fuel) ------------------------------------------
  /** Emission standard (e.g. 国六) */
  emission_standard: string;
  /** Fuel type (e.g. 柴油, 汽油, 纯电动, LNG) */
  fuel_type: string;
  /** Fuel consumption (L/100km) */
  fuel_consumption: number | null;

  // -- 公告信息 (Certificate / Policy Flags) ---------------------------------
  /** Certificate / announcement number */
  certificate_number: string;
  /** Tax-exempt vehicle */
  is_tax_exempt: boolean;
  /** Fuel-tax-exempt */
  is_fuel_exempt: boolean;
  /** Meets environmental standards */
  is_environmental: boolean;

  // -- 其他 (Other) ----------------------------------------------------------
  /** Image URLs */
  images: string[];
  /** Free-text description */
  description: string;
  /** Record creation timestamp (ISO) */
  created_at: string;
  /** Record last-update timestamp (ISO) */
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Search / filter helpers
// ---------------------------------------------------------------------------

/** Fields that support keyword (exact-match) filtering / faceted search. */
export type VehicleKeywordField =
  | "brand"
  | "manufacturer"
  | "model_number"
  | "announcement_batch"
  | "vehicle_type"
  | "vehicle_category"
  | "purpose"
  | "tonnage_class"
  | "chassis_brand"
  | "chassis_model"
  | "drive_type"
  | "tire_spec"
  | "suspension_type"
  | "engine_brand"
  | "engine_model"
  | "emission_standard"
  | "fuel_type"
  | "certificate_number";

/** Fields that support numeric range queries. */
export type VehicleNumericField =
  | "length"
  | "width"
  | "height"
  | "wheelbase"
  | "cargo_length"
  | "cargo_width"
  | "cargo_height"
  | "cargo_volume"
  | "curb_weight"
  | "gvw"
  | "payload"
  | "rated_payload"
  | "max_towing_weight"
  | "axle_count"
  | "tire_count"
  | "displacement"
  | "power_kw"
  | "power_hp"
  | "torque"
  | "cylinders"
  | "fuel_consumption";

/** A numeric range filter value. */
export interface NumericRange {
  gte?: number;
  lte?: number;
}

/** Search request payload sent to the backend. */
export interface VehicleSearchRequest {
  /** Free-text query (searched against name, description, purpose) */
  query?: string;
  /** Exact-match keyword filters */
  filters?: Partial<Record<VehicleKeywordField, string | string[]>>;
  /** Numeric range filters */
  ranges?: Partial<Record<VehicleNumericField, NumericRange>>;
  /** Boolean filters */
  booleans?: {
    is_tax_exempt?: boolean;
    is_fuel_exempt?: boolean;
    is_environmental?: boolean;
  };
  /** Pagination */
  page?: number;
  page_size?: number;
  /** Sort field and direction */
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

/** Paginated search response from the backend. */
export interface VehicleSearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: Vehicle[];
  /** Aggregation buckets for faceted navigation */
  aggregations?: Record<string, AggregationBucket[]>;
}

/** A single aggregation bucket (for faceted counts). */
export interface AggregationBucket {
  key: string;
  doc_count: number;
}
