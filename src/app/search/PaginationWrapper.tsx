"use client";

import Pagination from "@/components/Pagination";

interface PaginationWrapperProps {
  total: number;
  page: number;
  pageSize: number;
}

export default function PaginationWrapper({
  total,
  page,
  pageSize,
}: PaginationWrapperProps) {
  return <Pagination total={total} page={page} pageSize={pageSize} />;
}
