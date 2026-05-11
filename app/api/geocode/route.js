export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return Response.json([])
  try {
    const r = await fetch(
      'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5&addressdetails=1&countrycodes=tr',
      { headers: { 'User-Agent': 'RandevuApp/1.0 (info@randevuapp.com)', 'Accept-Language': 'tr' } }
    )
    const data = await r.json()
    return Response.json(data)
  } catch(e) {
    return Response.json([])
  }
}
