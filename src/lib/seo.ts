/**
 * SEO helper functions for generating meta tags and JSON-LD structured data.
 */

import type { Vehicle } from "@/types/vehicle";

// ---------------------------------------------------------------------------
// Site-wide constants
// ---------------------------------------------------------------------------

export const SITE_NAME = "专汽智云 | SPV Cloud";
export const SITE_DESCRIPTION =
  "专用车行业数字化服务平台，提供公告产品查询、底盘数据、行业资讯等一站式服务";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://spv-cloud.com";

// ---------------------------------------------------------------------------
// Vehicle detail page helpers
// ---------------------------------------------------------------------------

export interface MetaInfo {
  title: string;
  description: string;
  keywords: string;
}

/** Generate meta title, description, and keywords for a vehicle detail page. */
export function generateVehicleMeta(vehicle: Vehicle): MetaInfo {
  const title = `${vehicle.name} - ${vehicle.brand} ${vehicle.vehicle_type} | ${SITE_NAME}`;

  const descParts = [
    vehicle.name,
    vehicle.engine_brand && vehicle.engine_model
      ? `搭载${vehicle.engine_brand} ${vehicle.engine_model}发动机`
      : null,
    vehicle.power_hp ? `${vehicle.power_hp}马力` : null,
    vehicle.gvw ? `总质量${vehicle.gvw}kg` : null,
    vehicle.emission_standard ? `${vehicle.emission_standard}排放` : null,
  ];
  const description = descParts.filter(Boolean).join("，");

  const keywords = [
    vehicle.brand,
    vehicle.vehicle_type,
    vehicle.model_number,
    vehicle.manufacturer,
    vehicle.engine_brand,
    vehicle.tonnage_class,
    "专用车公告",
    "专汽智云",
  ]
    .filter(Boolean)
    .join(",");

  return { title, description, keywords };
}

/** Generate JSON-LD Product structured data for a vehicle. */
export function generateVehicleJsonLd(vehicle: Vehicle): Record<string, unknown> {
  const meta = generateVehicleMeta(vehicle);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vehicle.name,
    description: meta.description,
    brand: {
      "@type": "Brand",
      name: vehicle.brand,
    },
    manufacturer: {
      "@type": "Organization",
      name: vehicle.manufacturer,
    },
    model: vehicle.model_number,
    vehicleIdentificationNumber: vehicle.certificate_number,
    url: `${SITE_URL}/vehicle/${vehicle.id}`,
    image: vehicle.images.length > 0 ? vehicle.images[0] : undefined,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "车辆类型",
        value: vehicle.vehicle_type,
      },
      {
        "@type": "PropertyValue",
        name: "驱动形式",
        value: vehicle.drive_type,
      },
      vehicle.gvw
        ? {
            "@type": "PropertyValue",
            name: "总质量",
            value: `${vehicle.gvw} kg`,
          }
        : null,
      vehicle.power_hp
        ? {
            "@type": "PropertyValue",
            name: "功率",
            value: `${vehicle.power_hp} hp`,
          }
        : null,
      vehicle.emission_standard
        ? {
            "@type": "PropertyValue",
            name: "排放标准",
            value: vehicle.emission_standard,
          }
        : null,
    ].filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Search page helpers
// ---------------------------------------------------------------------------

export interface SearchFilters {
  query?: string;
  brand?: string;
  vehicle_type?: string;
  [key: string]: string | undefined;
}

/** Generate meta title and description for a search results page. */
export function generateSearchMeta(filters: SearchFilters): {
  title: string;
  description: string;
} {
  const parts = [filters.brand, filters.vehicle_type, filters.query].filter(
    Boolean,
  );

  const title =
    (parts.length > 0 ? parts.join(" ") + " - " : "") +
    `公告产品查询 | ${SITE_NAME}`;

  const description = parts.length > 0
    ? `查询${parts.join(" ")}公告产品数据，支持多条件筛选 - ${SITE_NAME}`
    : `专用车公告产品数据库，支持品牌、吨位、排放标准等多维度交叉筛选 - ${SITE_NAME}`;

  return { title, description };
}
