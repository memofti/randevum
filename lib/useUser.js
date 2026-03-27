'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useUser(requiredRole) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_user')
      if (!raw) { router.push('/login'); return }
      const u = JSON.parse(raw)
      setUser(u)
      setReady(true)
    } catch {
      router.push('/login')
    }
  }, [router])

  function logout() {
    localStorage.removeItem('randevu_user')
    router.push('/login')
  }

  return { user, ready, logout }
}
