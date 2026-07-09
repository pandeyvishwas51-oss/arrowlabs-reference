import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://arrowlabs.art'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${APP_URL}`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${APP_URL}/showcase`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${APP_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${APP_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
