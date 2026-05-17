// Basit in-memory rate limit — per-IP. Nominatim'i kötüye kullanılan proxy olmaktan korur.
// Vercel'in serverless/edge ortamında her instance kendi sayacını tutar; ufak ölçekte yeterli.
const HITS = new Map() // ip → [{ts}, ...]
const WINDOW_MS = 60_000        // 1 dakika
const MAX_PER_WINDOW = 20       // dakikada 20 istek

function getIp(request) {
  const fwd = request.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
}

function checkLimit(ip) {
  const now = Date.now()
  const list = (HITS.get(ip) || []).filter(t => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) {
    HITS.set(ip, list)
    return false
  }
  list.push(now)
  HITS.set(ip, list)
  // Map'i temiz tutmak için ara sıra eski IP'leri at
  if (HITS.size > 5000) {
    for (const [k, v] of HITS) {
      if (!v.length || now - v[v.length-1] > WINDOW_MS) HITS.delete(k)
    }
  }
  return true
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return Response.json([])
  // Aşırı uzun input'a izin verme — Nominatim zaten 256 char civarı kabul ediyor
  if (q.length > 200) return Response.json([], { status: 400 })

  const ip = getIp(request)
  if (!checkLimit(ip)) {
    return Response.json(
      { error: 'rate_limited', message: 'Çok fazla istek — bir dakika sonra deneyin' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  try {
    const r = await fetch(
      'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5&addressdetails=1&countrycodes=tr',
      { headers: { 'User-Agent': 'RandevuApp/1.0 (info@randevuapp.com)', 'Accept-Language': 'tr' } }
    )
    if (!r.ok) return Response.json([], { status: 502 })
    const data = await r.json()
    return Response.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return Response.json([])
  }
}
