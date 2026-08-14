import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/auth/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motopayee.vercel.app';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/hire`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/imports`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/apply`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Published listings
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(5000);

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((l: Record<string, unknown>) => ({
    url: `${baseUrl}/listings/${l.id as string}`,
    lastModified: new Date(l.updated_at as string),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Published hire listings
  const { data: hireListings } = await supabaseAdmin
    .from('hire_listings')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(5000);

  const hirePages: MetadataRoute.Sitemap = (hireListings ?? []).map((l: Record<string, unknown>) => ({
    url: `${baseUrl}/hire/${l.id as string}`,
    lastModified: new Date(l.updated_at as string),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...listingPages, ...hirePages];
}
