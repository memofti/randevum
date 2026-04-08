import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// SMS gönder (Netgsm Edge Function)
export async function sendSMS(type, appointment_id) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ type, appointment_id }),
    })
  } catch(e) {
    console.error('SMS hatası:', e)
  }
}

// Bildirim gönder (Edge Function)
export async function sendNotification(type, appointment_id) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ type, appointment_id }),
    })
  } catch(e) {
    console.error('Bildirim hatası:', e)
  }
}

// WhatsApp bildirimi (Twilio)
export async function sendWhatsApp(type, appointment_id) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ type, appointment_id }),
    })
  } catch(e) {
    console.error('WhatsApp hatası:', e)
  }
}

// Supabase Storage'a görsel yükle
export async function uploadMedia(file, folder = 'general') {
  const ext = file.name.split('.').pop()
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from('media').upload(name, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(name)
  return publicUrl
}

// Supabase Storage'dan sil
export async function deleteMedia(url) {
  try {
    const path = url.split('/media/')[1]
    if (path) await supabase.storage.from('media').remove([path])
  } catch(e) {
    console.error('Silme hatası:', e)
  }
}
