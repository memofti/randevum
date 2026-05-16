import { createClient } from '@supabase/supabase-js'

export default async function sitemap() {
  const base = 'https://randevum-lemon.vercel.app'
  const staticUrls = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: base + '/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
  try {
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: bizes } = await supa.from('businesses').select('id, updated_at').eq('status', 'active').limit(1000)
    const bizUrls = (bizes || []).map(b => ({
      url: `${base}/firma/${b.id}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    return [...staticUrls, ...bizUrls]
  } catch {
    return staticUrls
  }
}
