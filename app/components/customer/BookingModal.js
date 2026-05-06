'use client'
import { useState } from 'react'

export default function BookingModal({ biz, services, staff, onClose, onBook, toast3 }) {
  const [form, setForm] = useState({ service:'', staff:'', date:'', time:'' })
  const [payStep, setPayStep] = useState(false)
  const [payCard, setPayCard] = useState({ name:'', number:'', expire:'', cvv:'' })
  const [takenSlots, setTakenSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)

  if (!biz) return null

  const generateSlots = () => {
    if (!form.date) return []
    const day = new Date(form.date).getDay()
    const defaultWH = {"1":{str:"09:00",end:"18:00",off:false},"2":{str:"09:00",end:"18:00",off:false},"3":{str:"09:00",end:"18:00",off:false},"4":{str:"09:00",end:"18:00",off:false},"5":{str:"09:00",end:"18:00",off:false},"6":{str:"10:00",end:"15:00",off:false},"0":{str:"09:00",end:"18:00",off:true}}
    const wh = (biz.working_hours||defaultWH)[day]
    if (!wh||wh.off) return null
    const [sH,sM] = (wh.str||"09:00").split(':').map(Number)
    const [eH,eM] = (wh.end||"18:00").split(':').map(Number)
    let cur = sH*60+sM; const end = eH*60+eM
    const svc = services.find(s=>s.id===form.service)
    const dur = svc ? svc.duration_min : 60
    const slots = []
    while(cur+dur<=end) { const h=Math.floor(cur/60),m=cur%60; slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`); cur+=dur }
    return slots
  }
  const availableSlots = generateSlots()

  const loadTakenSlots = async (date) => {
    if (!date) return
    const { supabase } = await import('@/lib/supabase')
    setSlotsLoading(true)
    const { data } = await supabase.from('appointments').select('appointment_time').eq('business_id', biz.id).eq('appointment_date', date).in('status',['pending','confirmed'])
    setTakenSlots((data||[]).map(a=>String(a.appointment_time).slice(0,5)))
    setSlotsLoading(false)
  }

  const handleBook = async () => {
    if (!form.service||!form.date||!form.time) { toast3('❌ Hizmet, tarih ve saat seçin'); return }
    if (takenSlots.includes(form.time)) { toast3('❌ Bu saat dolu'); return }
    setBooking(true)
    await onBook(form, payCard)
    setBooking(false)
  }

  const svc = services.find(s=>s.id===form.service)

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <div className="font-bold">{payStep?'💳 Ödeme':'Randevu Al'}</div>
            <div className="text-xs text-gray-500">{biz.name}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">1</div>
              <div className="h-px w-4 bg-gray-200"/>
              <div className={'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold '+(payStep?'bg-orange-500 text-white':'bg-gray-200 text-gray-500')}>2</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
          </div>
        </div>
        {!payStep ? (
          <>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Hizmet *</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                  value={form.service} onChange={e=>setForm(p=>({...p,service:e.target.value,time:''}))}>
                  <option value="">Hizmet seçin</option>
                  {services.map(s=><option key={s.id} value={s.id}>{s.name} — ₺{s.price} ({s.duration_min} dk)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Personel</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                  value={form.staff} onChange={e=>setForm(p=>({...p,staff:e.target.value}))}>
                  <option value="">Fark etmez</option>
                  {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Tarih *</label>
                  <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                    min={new Date().toISOString().split('T')[0]} value={form.date}
                    onChange={e=>{setForm(p=>({...p,date:e.target.value,time:''})); loadTakenSlots(e.target.value)}}/>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Saat{slotsLoading&&<span className="text-gray-400 font-normal text-xs"> (kontrol...)</span>}</label>
                  {availableSlots===null
                    ? <div className="w-full px-3 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-semibold flex items-center justify-center">Kapalı</div>
                    : <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                        value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}
                        disabled={!form.date||slotsLoading||!form.service}>
                        <option value="">{form.service?'Saat seçin':'Önce hizmet'}</option>
                        {(availableSlots||[]).map(t=><option key={t} value={t} disabled={takenSlots.includes(t)}>{t}{takenSlots.includes(t)?' — Dolu':''}</option>)}
                      </select>
                  }
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={()=>{
                if(!form.service||!form.date){toast3('❌ Hizmet ve tarih seçin');return}
                if(!form.time){toast3('❌ Saat seçin');return}
                if(takenSlots.includes(form.time)){toast3('❌ Bu saat dolu');return}
                setPayStep(true)
              }} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold">Devam → Ödeme</button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="text-xs font-bold text-orange-700 mb-2">ÖZET</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Hizmet</span><span className="font-semibold">{svc?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Tarih</span><span className="font-semibold">{new Date(form.date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Saat</span><span className="font-semibold">{form.time}</span></div>
                  <div className="flex justify-between border-t border-orange-200 pt-1.5 mt-1.5"><span className="font-bold">Toplam</span><span className="font-bold text-orange-600 text-base">₺{svc?.price||0}</span></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <input placeholder="Kart üzerindeki isim" value={payCard.name} onChange={e=>setPayCard(p=>({...p,name:e.target.value}))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 uppercase tracking-wide"/>
                <input placeholder="1234 5678 9012 3456" maxLength={19} value={payCard.number}
                  onChange={e=>setPayCard(p=>({...p,number:e.target.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim()}))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono tracking-widest"/>
                <div className="grid grid-cols-2 gap-2.5">
                  <input placeholder="MM/YY" maxLength={5} value={payCard.expire}
                    onChange={e=>setPayCard(p=>({...p,expire:e.target.value.replace(/\D/g,'').replace(/(\d{2})/,'$1/').slice(0,5)}))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono"/>
                  <input placeholder="CVV" maxLength={3} type="password" value={payCard.cvv}
                    onChange={e=>setPayCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,3)}))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono"/>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1.5">🔒 Güvenli ödeme · 256-bit SSL</div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setPayStep(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">← Geri</button>
              <button onClick={handleBook} disabled={booking}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                {booking?'Kaydediliyor...':'💳 Ödemeyi Tamamla'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
