'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveUser } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      const u = await getActiveUser()
      // Misafir modu: oturum yoksa müşteri keşfet sayfasına gönder, /login'e değil
      if (!u) { router.push('/customer'); return }
      if (u.role === 'admin') { router.push('/admin'); return }
      if (u.role === 'business_owner') { router.push('/business'); return }
      router.push('/customer')
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )
}
