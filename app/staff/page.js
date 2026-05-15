'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COLORS = ['#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444','#ff6b35']

function Bdg({ s }) {
  const m = {
    confirmed:['bg-green-50 text-green-700 border-green-200','✓ Onaylı'],
    pending:['bg-amber-50 text-amber-700 border-amber-200','⏳ Bekliyor'],
    completed:['bg-gray-100 text-gray-600 border-gray-200','Tamamlandı'],
    cancelled:['bg-red-50 text-red-600 border-red-200','İptal']
  }
  const [c,l]=m[s]||m.completed
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${c}`}>{l}</span>
}

export default function StaffDashboard() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [appts, setAppts] = useState([])
  const [calDate, setCalDate] = useState(new Date().toISOString().split('T')[0])
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const toast3 = (m) => { setToast(m); setTimeout(()=>setToast(''),3500) }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_staff')
      if (!raw) { router.push('/staff/login'); return }
      setMe(JSON.parse(raw))
    } catch { router.push('/staff/login') }
  }, [router])

  const load = useCallback(async (staffId) => {
    setLoading(true)
    const pw = typeof window !== 'undefined' ? sessionStorage.getItem('randevu_staff_pw') : null
    if (!pw) { router.push('/staff/login'); return }
    const { data, error } = await supabase.rpc('staff_appointments', {
      p_staff_id: staffId,
      p_password: pw,
    })
    if (error) { console.error(error); setAppts([]); setLoading(false); return }
    // RPC dönüşünü mevcut komponentin beklediği şekle çevir
    const rows = (data || []).map(r => ({
      id: r.id,
      appointment_date: r.appointment_date,
      appointment_time: r.appointment_time,
      status: r.status,
      price: r.price,
      notes: r.notes,
      qr_token: r.qr_token,
      profiles: { full_name: r.customer_name, email: r.customer_email, phone: r.customer_phone },
      services: { name: r.service_name, price: r.service_price, duration_min: r.service_duration },
    }))
    setAppts(rows)
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (!me?.id) return
    load(me.id)
    // RLS staff için auth.uid() olmadığından realtime postgres_changes
    // sessizce 0 satır gönderecek; manuel 30 sn'de bir poll
    const t = setInterval(() => load(me.id), 30000)
    return () => clearInterval(t)
  }, [me, load])

  async function staffAction(id, status) {
    const pw = typeof window !== 'undefined' ? sessionStorage.getItem('randevu_staff_pw') : null
    if (!me?.id || !pw) { toast3('❌ Oturum süresi doldu — yeniden giriş yapın'); router.push('/staff/login'); return false }
    const { data, error } = await supabase.rpc('staff_update_appointment_status', {
      p_staff_id: me.id,
      p_password: pw,
      p_appointment_id: id,
      p_status: status,
    })
    if (error) { toast3('❌ '+error.message); return false }
    if (!data) { toast3('❌ Güncellenemedi — yetkiniz olmayabilir'); return false }
    return true
  }
  async function confirmAppt(id) {
    if (await staffAction(id, 'confirmed')) { setAppts(p=>p.map(a=>a.id===id?{...a,status:'confirmed'}:a)); toast3('✅ Randevu onaylandı') }
  }
  async function completeAppt(id) {
    if (await staffAction(id, 'completed')) { setAppts(p=>p.map(a=>a.id===id?{...a,status:'completed'}:a)); toast3('✅ Tamamlandı') }
  }
  async function cancelAppt(id) {
    if (!confirm('Bu randevu iptal edilsin mi?')) return
    if (await staffAction(id, 'cancelled')) { setAppts(p=>p.map(a=>a.id===id?{...a,status:'cancelled'}:a)); toast3('Randevu iptal edildi') }
  }
  function logout() {
    localStorage.removeItem('randevu_staff')
    sessionStorage.removeItem('randevu_staff_pw')
    router.push('/staff/login')
  }

  if (!me) return null

  const today = new Date().toISOString().split('T')[0]
  const dayAppts = appts
    .filter(a => a.appointment_date === calDate && a.status !== 'cancelled')
    .sort((a,b)=>String(a.appointment_time).localeCompare(String(b.appointment_time)))

  const upcoming = appts.filter(a => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed')
  const past = appts.filter(a => a.appointment_date < today || a.status === 'completed' || a.status === 'cancelled')

  const totalEarnings = appts.filter(a => a.status === 'completed').reduce((s,a)=>s+(a.price||0),0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {me.avatar_url
            ? <img src={me.avatar_url} alt={me.name} className="w-11 h-11 rounded-full object-cover border-2 border-white/20" />
            : <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold" style={{background:COLORS[0]}}>{me.name?.[0]||'?'}</div>
          }
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm truncate">{me.name}</div>
            <div className="text-white/50 text-xs truncate">{me.business_emoji||'🏢'} {me.business_name||'—'} · {me.speciality||'Personel'}</div>
          </div>
          <button onClick={logout} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold">Çıkış</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-semibold">Toplam</div>
            <div className="text-xl font-extrabold text-blue-500">{appts.filter(a=>a.status!=='cancelled').length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-semibold">Tamamlandı</div>
            <div className="text-xl font-extrabold text-green-500">{appts.filter(a=>a.status==='completed').length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-semibold">Kazanç</div>
            <div className="text-xl font-extrabold text-orange-500">₺{totalEarnings}</div>
          </div>
        </div>

        {/* Tab */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex mb-4">
          {[['today','📅 Günlük'],['upcoming','⏭️ Yaklaşan'],['past','📋 Geçmiş']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={'flex-1 py-2 rounded-lg text-xs font-bold transition-all '+(tab===k?'bg-blue-500 text-white shadow':'text-gray-500 hover:bg-gray-50')}>
              {l}
            </button>
          ))}
        </div>

        {tab==='today' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="font-bold text-sm">📅 Günlük Takvim</div>
              <input type="date" value={calDate} onChange={e=>setCalDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400" />
            </div>
            <div className="p-4">
              {loading ? <div className="text-center py-8 text-gray-400 text-sm">Yükleniyor...</div>
               : dayAppts.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">Bu gün için randevu yok ✨</div>
               : <div className="space-y-2">
                   {dayAppts.map(a=>(
                     <div key={a.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50">
                       <div className="text-base font-extrabold text-blue-500 w-16 flex-shrink-0">{String(a.appointment_time).slice(0,5)}</div>
                       <div className="flex-1 min-w-0">
                         <div className="text-sm font-bold truncate">{a.profiles?.full_name||'Müşteri'}</div>
                         <div className="text-xs text-gray-500 truncate">{a.services?.name||'—'} · {a.services?.duration_min||60}dk · ₺{a.price||0}</div>
                         {a.profiles?.phone && <div className="text-xs text-gray-400">📞 {a.profiles.phone}</div>}
                       </div>
                       <div className="flex flex-col gap-1 items-end">
                         <Bdg s={a.status} />
                         <div className="flex gap-1">
                           {a.status==='pending' && <button onClick={()=>confirmAppt(a.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md font-semibold">✓</button>}
                           {a.status==='confirmed' && <button onClick={()=>completeAppt(a.id)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md font-semibold">Tam.</button>}
                           {['pending','confirmed'].includes(a.status) && <button onClick={()=>cancelAppt(a.id)} className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2 py-1 rounded-md">✗</button>}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              }
            </div>
          </div>
        )}

        {tab==='upcoming' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="font-bold text-sm mb-3">⏭️ Yaklaşan Randevular ({upcoming.length})</div>
            {upcoming.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">Yaklaşan randevu yok</div>
             : <div className="space-y-2">
                {upcoming.map(a=>(
                  <div key={a.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="text-right w-20 flex-shrink-0">
                      <div className="text-xs font-bold text-gray-500">{new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</div>
                      <div className="text-sm font-extrabold text-blue-500">{String(a.appointment_time).slice(0,5)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{a.profiles?.full_name||'Müşteri'}</div>
                      <div className="text-xs text-gray-500 truncate">{a.services?.name||'—'} · ₺{a.price||0}</div>
                    </div>
                    <Bdg s={a.status} />
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {tab==='past' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="font-bold text-sm mb-3">📋 Geçmiş ({past.length})</div>
            {past.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">Geçmiş randevu yok</div>
             : <div className="space-y-2">
                {past.slice(0,50).map(a=>(
                  <div key={a.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="text-right w-20 flex-shrink-0">
                      <div className="text-xs font-bold text-gray-500">{new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</div>
                      <div className="text-sm font-extrabold text-gray-400">{String(a.appointment_time).slice(0,5)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{a.profiles?.full_name||'Müşteri'}</div>
                      <div className="text-xs text-gray-500 truncate">{a.services?.name||'—'} · ₺{a.price||0}</div>
                    </div>
                    <Bdg s={a.status} />
                  </div>
                ))}
              </div>
            }
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}
    </div>
  )
}
