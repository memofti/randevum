'use client'
import { useState, useEffect, useRef } from 'react'

export default function QRScanPage() {
  const [manualToken, setManualToken] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCheck = async (token) => {
    if (!token.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        body: JSON.stringify({ qr_token: token.trim() })
      })
      const d = await r.json()
      setStatus(d)
    } catch(e) {
      setStatus({ error: 'Bağlantı hatası' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📲</div>
          <h1 className="text-xl font-extrabold">QR Randevu Onayı</h1>
          <p className="text-sm text-gray-400 mt-1">Müşterinin QR kodunu taratın</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-center mb-6 border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Müşterinin telefon ekranındaki QR kodunu okutun veya token'ı girin:</p>
          <div className="flex gap-2">
            <input placeholder="QR token..." value={manualToken} onChange={e=>setManualToken(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleCheck(manualToken)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
            <button onClick={()=>handleCheck(manualToken)} disabled={loading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl">
              {loading?'...':'✓'}
            </button>
          </div>
        </div>
        {status && (
          <div className={'rounded-2xl p-4 text-center '+(status.success?'bg-green-50 border border-green-200':status.error?.includes('zaten')?'bg-amber-50 border border-amber-200':'bg-red-50 border border-red-200')}>
            <div className="text-2xl mb-2">{status.success?'✅':status.error?.includes('zaten')?'⚠️':'❌'}</div>
            <div className={'font-bold '+(status.success?'text-green-700':status.error?.includes('zaten')?'text-amber-700':'text-red-700')}>
              {status.success?'Randevu Tamamlandı!':status.error}
            </div>
            {status.success && (
              <div className="mt-3 space-y-1 text-sm text-left">
                <div className="flex justify-between"><span className="text-gray-500">Müşteri</span><span className="font-semibold">{status.customer}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hizmet</span><span className="font-semibold">{status.service}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Saat</span><span className="font-semibold">{status.time}</span></div>
              </div>
            )}
          </div>
        )}
        <button onClick={()=>window.close()} className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
          Kapat
        </button>
      </div>
    </div>
  )
}
