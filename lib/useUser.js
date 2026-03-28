'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

export function useUser(requiredRole) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        // Önce Supabase Auth oturumunu kontrol et
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, phone, loyalty_points, loyalty_tier, created_at')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile) {
            setUser({ id: profile.id, email: profile.email, name: profile.full_name, role: profile.role, ...profile })
            setReady(true)
            return
          }
        }
        // Supabase session yoksa localStorage'a bak (demo kullanıcılar)
        const raw = localStorage.getItem('randevu_user')
        if (!raw) { router.push('/login'); return }
        const u = JSON.parse(raw)
        setUser(u)
        setReady(true)
      } catch {
        router.push('/login')
      }
    }
    loadUser()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('randevu_user')
    router.push('/login')
  }

  return { user, ready, logout }
}
