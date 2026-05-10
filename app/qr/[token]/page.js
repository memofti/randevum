'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function QRCheckIn() {
  const params = useParams()
  const token = params.token
  const [status, setStatus] = useState('loading') // loading | success | error | already
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/qr-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      body: JSON.stringify({ qr_token: token })
    })
    .then(r => r.json())
    .then(d => {
      if (d.success) { setStatus('success'); setData(d) }
      else if (d.error?.includes('zaten')) { setStatus('already'); setMsg(d.error) }
      else { setStatus('error'); setMsg(d.error || 'Bilinmeyen hata') }
    })
    .catch(() => { setStatus('error'); setMsg('Sunucu hatası') })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"/>
            <div className="font-bold text-gray-600">Randevu doğrulanıyor...</div>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-extrabold text-green-600 mb-2">Randevu Tamamlandı!</div>
            <div className="bg-green-50 rounded-2xl p-4 mb-4 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Müşteri</span><span className="font-bold">{data?.customer}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Hizmet</span><span className="font-bold">{data?.service}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Tarih</span><span className="font-bold">{new Date(data?.date).toLocaleDateString('tr-TR', {day:'numeric',month:'long'})}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Saat</span><span className="font-bold">{data?.time}</span></div>
            </div>
            <div className="text-xs text-gray-400">Randevu başarıyla işaretlendi</div>
          </>
        )}
        {status === 'already' && (
          <>
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-xl font-extrabold text-amber-600 mb-2">Zaten İşlendi</div>
            <div className="text-sm text-gray-500">{msg}</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <div className="text-xl font-extrabold text-red-600 mb-2">Hata</div>
            <div className="text-sm text-gray-500">{msg}</div>
          </>
        )}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <div className="w-4 h-4 rounded-md bg-orange-500 flex items-center justify-center text-white text-xs">📅</div>
          RandevuApp
        </div>
      </div>
    </div>
  )
}
