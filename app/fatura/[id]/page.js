'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FaturaPage() {
  const params = useParams()
  const [appt, setAppt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    supabase.from('appointments')
      .select('*, businesses(name,address,phone,email,city), profiles(full_name,email,phone), services(name,duration_min), staff(name)')
      .eq('id', params.id)
      .maybeSingle()
      .then(({data}) => { setAppt(data); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"/></div>
  if (!appt) return <div className="flex items-center justify-center min-h-screen text-gray-500">Randevu bulunamadı</div>

  const invoiceNo = 'RV-' + appt.id.slice(0,8).toUpperCase()
  const date = new Date(appt.appointment_date).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold">📅</div>
              <span className="font-extrabold text-xl text-gray-800">RandevuApp</span>
            </div>
            <div className="text-xs text-gray-400">randevuapp.com</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-gray-800">FATURA</div>
            <div className="text-sm text-gray-500 mt-1">#{invoiceNo}</div>
            <div className="text-sm text-gray-400">{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Firma & Müşteri */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Hizmet Veren</div>
            <div className="font-bold text-gray-800">{appt.businesses?.name}</div>
            <div className="text-sm text-gray-500">{appt.businesses?.address}</div>
            <div className="text-sm text-gray-500">{appt.businesses?.city}</div>
            {appt.businesses?.phone && <div className="text-sm text-gray-500">{appt.businesses.phone}</div>}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Müşteri</div>
            <div className="font-bold text-gray-800">{appt.profiles?.full_name}</div>
            {appt.profiles?.email && <div className="text-sm text-gray-500">{appt.profiles.email}</div>}
            {appt.profiles?.phone && <div className="text-sm text-gray-500">{appt.profiles.phone}</div>}
          </div>
        </div>

        {/* Tablo */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Hizmet</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tarih & Saat</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Personel</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-4 text-sm font-semibold">{appt.services?.name || 'Hizmet'}</td>
              <td className="px-4 py-4 text-sm text-gray-500">{date} {String(appt.appointment_time).slice(0,5)}</td>
              <td className="px-4 py-4 text-sm text-gray-500">{appt.staff?.name || '—'}</td>
              <td className="px-4 py-4 text-sm font-bold text-right">₺{appt.price || 0}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan="3" className="px-4 py-3 text-sm font-bold text-right">Toplam</td>
              <td className="px-4 py-3 text-lg font-extrabold text-right text-orange-500">₺{appt.price || 0}</td>
            </tr>
          </tfoot>
        </table>

        {/* Durum */}
        <div className="flex items-center justify-between mb-8">
          <div className={"px-4 py-2 rounded-full text-sm font-bold "+(appt.status==='completed'?'bg-green-100 text-green-700':appt.status==='confirmed'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600')}>
            {appt.status==='completed'?'✅ Tamamlandı':appt.status==='confirmed'?'✓ Onaylandı':'Bekliyor'}
          </div>
          <div className="text-xs text-gray-400">Randevu No: {appt.id.slice(0,8).toUpperCase()}</div>
        </div>

        {/* Print & Kapat */}
        <div className="flex gap-3 print:hidden">
          <button onClick={()=>window.print()} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl">🖨️ Yazdır / PDF</button>
          <button onClick={()=>window.close()} className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50">Kapat</button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          RandevuApp · Bu fatura elektronik olarak oluşturulmuştur.
        </div>
      </div>
    </div>
  )
}
