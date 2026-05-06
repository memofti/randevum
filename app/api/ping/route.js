import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    // Supabase'i uyandır
    await supabase.from('businesses').select('id').limit(1)
    return Response.json({ ok: true, time: new Date().toISOString() })
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}
