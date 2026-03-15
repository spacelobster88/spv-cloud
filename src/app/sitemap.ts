import { allVehicles } from "@/lib/vehicles-data";
import { SITE_URL } from "@/lib/seo";

type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export default function sitemap(): SitemapEntry[] {
  const now = new Date();

  // Static pages
  const staticPages: SitemapEntry[] = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/coming-soon`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic vehicle pages
  const vehiclePages: SitemapEntry[] = allVehicles.map((v) => ({
    url: `${SITE_URL}/vehicle/${v.id}`,
    lastModified: v.updated_at ? new Date(v.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...vehiclePages];
}
