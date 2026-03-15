"use client";

import SearchFilters from "@/components/SearchFilters";
import type { AggregationBucket } from "@/types/vehicle";

interface FiltersWrapperProps {
  aggregations?: Record<string, AggregationBucket[]>;
}

export default function FiltersWrapper({ aggregations }: FiltersWrapperProps) {
  return <SearchFilters aggregations={aggregations} />;
}
