import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({ params }) {
  try {
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: biz } = await supa.from('businesses')
      .select('name, category, city, bio, description, cover_url, rating, review_count')
      .eq('id', params.id).maybeSingle()
    if (!biz) return { title: 'Firma bulunamadı' }
    const desc = (biz.bio || biz.description || `${biz.name} — ${biz.category}, ${biz.city}. ${biz.review_count || 0} değerlendirme, ⭐ ${biz.rating || 0}/5.`).slice(0, 160)
    return {
      title: biz.name,
      description: desc,
      openGraph: {
        title: `${biz.name} — ${biz.category}`,
        description: desc,
        images: biz.cover_url ? [biz.cover_url] : undefined,
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: biz.name,
        description: desc,
        images: biz.cover_url ? [biz.cover_url] : undefined,
      },
    }
  } catch {
    return { title: 'Firma Detayı' }
  }
}

export default function FirmaLayout({ children }) { return children }
