import { supabase } from './supabase'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Push subscribe + DB'ye kaydet. Permission önceden alınmış olmalı.
// VAPID key yoksa sadece local notification için izin ister, abone olmaz.
export async function subscribePush(profileId) {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  if (!profileId) return null

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()

  if (!sub) {
    if (!VAPID_PUBLIC) return null
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
    } catch (e) {
      console.warn('Push subscribe failed:', e.message)
      return null
    }
  }

  const j = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    endpoint: j.endpoint,
    p256dh: j.keys?.p256dh || null,
    auth: j.keys?.auth || null,
  }, { onConflict: 'endpoint' })

  return sub
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return 'denied'
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}
