import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
