import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motopayee.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/me/', '/admin/', '/mfi/', '/field/', '/inspector/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
