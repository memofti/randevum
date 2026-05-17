'use client'
import { useEffect, useRef, useState } from 'react'

function extractToken(text) {
  if (!text) return ''
  const t = String(text).trim()
  const m = t.match(/\/qr\/([^/?#\s]+)/i)
  if (m) return m[1]
  try {
    const u = new URL(t)
    const parts = u.pathname.split('/').filter(Boolean)
    const i = parts.indexOf('qr')
    if (i >= 0 && parts[i+1]) return parts[i+1]
  } catch {}
  return t
}

export default function QRScanner({ bizId }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const detectorRef = useRef(null)
  const lastTokenRef = useRef('')
  const lockRef = useRef(false)
  const [supported, setSupported] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null) // {ok, msg, data?}
  const [manualToken, setManualToken] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Mobile-safe feature detection — BarcodeDetector + secure-context + mediaDevices
    if (typeof window === 'undefined') return
    let ok = true
    try {
      if (!('BarcodeDetector' in window)) ok = false
      if (!navigator?.mediaDevices?.getUserMedia) ok = false
      if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) ok = false
    } catch { ok = false }
    setSupported(ok)
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopCamera() {
    try { cancelAnimationFrame(rafRef.current) } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { try { t.stop() } catch {} })
        streamRef.current = null
      }
    } catch {}
    detectorRef.current = null
    setScanning(false)
  }

  async function startScanner() {
    setErr(''); setResult(null)
    try {
      if (!('BarcodeDetector' in window) || !navigator?.mediaDevices?.getUserMedia) {
        setSupported(false); return
      }
      // Detector'ı önce sınamak için try-catch ile yarat — bazı tarayıcılarda format desteklemiyorsa atar
      let detector = null
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      } catch (e) {
        setSupported(false)
        setErr('Bu tarayıcı QR kodu okumayı desteklemiyor. Aşağıdaki kutuya tokeni yapıştırın.')
        return
      }
      detectorRef.current = detector
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (!v) { stopCamera(); return }
      v.srcObject = stream
      try { await v.play() } catch {}
      setScanning(true)
      const tick = async () => {
        if (!streamRef.current || !detectorRef.current) return
        try {
          if (v.readyState >= 2) {
            const codes = await detectorRef.current.detect(v)
            if (codes && codes[0]?.rawValue && !lockRef.current) {
              const tok = extractToken(codes[0].rawValue)
              if (tok && tok !== lastTokenRef.current) {
                lastTokenRef.current = tok
                lockRef.current = true
                await checkIn(tok)
                setTimeout(() => { lockRef.current = false }, 1500)
              }
            }
          }
        } catch {}
        if (streamRef.current) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Kamera izni reddedildi. Tarayıcı ayarlarından kamera erişimine izin verin.'
        : (e?.message || 'Kamera açılamadı')
      setErr(msg)
      setScanning(false)
    }
  }

  async function checkIn(token) {
    setBusy(true); setResult(null); setErr('')
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!baseUrl || !anon) throw new Error('Sunucu ayarları eksik')
      const r = await fetch(baseUrl + '/functions/v1/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
        body: JSON.stringify({ qr_token: token }),
      })
      const d = await r.json().catch(()=>({success:false,error:'Sunucu yanıtı okunamadı'}))
      if (d.success) {
        setResult({ ok: true, msg: d.message || 'Randevu tamamlandı', data: d })
        if (navigator.vibrate) try { navigator.vibrate(120) } catch {}
      } else {
        setResult({ ok: false, msg: d.error || 'Doğrulama başarısız' })
      }
    } catch (e) {
      setResult({ ok: false, msg: e?.message || 'Sunucu hatası' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="mb-3">
          <div className="font-bold text-gray-900">QR Kod Okuyucu</div>
          <div className="text-xs text-gray-500">Müşterinin QR kodunu okutarak randevuyu tamamlayın</div>
        </div>

        {supported ? (
          <>
            <div className="relative bg-black rounded-xl overflow-hidden aspect-square mb-3">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover"/>
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                  Kamera kapalı
                </div>
              )}
              {scanning && (
                <div className="absolute inset-6 border-2 border-orange-400/80 rounded-xl pointer-events-none"/>
              )}
            </div>
            <div className="flex gap-2 mb-3">
              {!scanning ? (
                <button onClick={startScanner} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold">
                  📷 Kamerayı Aç
                </button>
              ) : (
                <button onClick={stopCamera} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-bold">
                  ⏹ Durdur
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800">
            Bu tarayıcı kamera tabanlı QR okumayı desteklemiyor (iPhone Safari, eski Android Chrome).
            <br/>QR kodun altındaki bağlantıyı veya tokeni aşağıya yapıştırın.
          </div>
        )}

        <div className="text-xs font-semibold text-gray-500 mb-1">veya elle giriş</div>
        <div className="flex gap-2 mb-3">
          <input
            value={manualToken}
            onChange={e=>setManualToken(e.target.value)}
            placeholder="QR token veya bağlantı"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"/>
          <button
            disabled={busy || !manualToken.trim()}
            onClick={()=>checkIn(extractToken(manualToken))}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold">
            Doğrula
          </button>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>
        )}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"/> Doğrulanıyor...
          </div>
        )}
        {result && (
          <div className={'rounded-xl p-4 border ' + (result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
            <div className={'font-bold mb-1 ' + (result.ok ? 'text-green-700' : 'text-red-700')}>
              {result.ok ? '✅ Randevu tamamlandı' : '❌ ' + result.msg}
            </div>
            {result.ok && result.data && (
              <div className="text-xs text-gray-700 space-y-0.5">
                {result.data.customer && <div><span className="text-gray-500">Müşteri:</span> <b>{result.data.customer}</b></div>}
                {result.data.service && <div><span className="text-gray-500">Hizmet:</span> <b>{result.data.service}</b></div>}
                {result.data.date && <div><span className="text-gray-500">Tarih:</span> <b>{new Date(result.data.date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} · {result.data.time}</b></div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
