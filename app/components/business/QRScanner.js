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
  const lastTokenRef = useRef('')
  const lockRef = useRef(false)
  const [supported, setSupported] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null) // {ok, msg, data?}
  const [manualToken, setManualToken] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) setSupported(false)
    return () => stopCamera()
  }, [])

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  async function startScanner() {
    setErr(''); setResult(null)
    if (!('BarcodeDetector' in window)) { setSupported(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      const v = videoRef.current
      v.srcObject = stream
      await v.play()
      setScanning(true)
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      const tick = async () => {
        if (!streamRef.current) return
        try {
          const codes = await detector.detect(v)
          if (codes && codes[0]?.rawValue && !lockRef.current) {
            const tok = extractToken(codes[0].rawValue)
            if (tok && tok !== lastTokenRef.current) {
              lastTokenRef.current = tok
              lockRef.current = true
              await checkIn(tok)
              setTimeout(() => { lockRef.current = false }, 1500)
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      setErr(e?.message || 'Kamera açılamadı')
      setScanning(false)
    }
  }

  async function checkIn(token) {
    setBusy(true); setResult(null); setErr('')
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/qr-checkin'
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        body: JSON.stringify({ qr_token: token }),
      })
      const d = await r.json()
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
            Bu tarayıcı kamera tabanlı QR okumayı desteklemiyor. Lütfen QR kodun altındaki bağlantıyı veya tokeni aşağıya yapıştırın.
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
