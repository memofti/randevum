'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u.role === 'admin') { router.push('/admin'); return }
        if (u.role === 'business_owner') { router.push('/business'); return }
        router.push('/customer')
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )
}
