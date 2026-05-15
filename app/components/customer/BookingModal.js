'use client'
import { useState } from 'react'
import { t as i18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

const VARIANTS = {
  default: { bg:'#fff', ink:'#0a0a0a', muted:'#6b7280', accent:'#f97316', border:'#e5e7eb', inputBg:'#fff', summary:'#fff7ed', summaryBorder:'#fed7aa' },
  minimal: { bg:'#fbfaf6', ink:'#111111', muted:'#8a8580', accent:'#b04a3a', border:'#e5e0d8', inputBg:'#fff', summary:'#fbfaf6', summaryBorder:'#b04a3a33' },
  luxury:  { bg:'#0f0f0f', ink:'#fff', muted:'rgba(255,255,255,0.55)', accent:'#d4af37', border:'#222', inputBg:'#1a1a1a', summary:'#1a1a1a', summaryBorder:'#d4af3744' },
  soft:    { bg:'#fff', ink:'#3a2a4a', muted:'#7e6a8a', accent:'#e85d8a', border:'#f5e0ea', inputBg:'#fff', summary:'#fff0f6', summaryBorder:'#e85d8a44' },
  bold:    { bg:'#fff', ink:'#0a0a12', muted:'#5a5d6a', accent:'#1736ff', border:'#0a0a12', inputBg:'#fff', summary:'#fff', summaryBorder:'#0a0a12' },
}

export default function BookingModal({ biz, services, staff, onClose, onBook, toast3, discount=0, paymentEnabled=false, variant='default', uiLang='tr', userId=null }) {
  const [form, setForm] = useState({ service:'', staff:'', date:'', time:'' })
  const [payStep, setPayStep] = useState(false)
  const [payCard, setPayCard] = useState({ name:'', number:'', expire:'', cvv:'' })
  const [takenSlots, setTakenSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponApplied, setCouponApplied] = useState(null) // {id, code, pct?, amount?}
  const [couponChecking, setCouponChecking] = useState(false)
  const [alarmSet, setAlarmSet] = useState(false)
  const [settingAlarm, setSettingAlarm] = useState(false)

  if (!biz) return null
  const T = (k, vars) => i18n(k, uiLang, vars)
  const V = VARIANTS[variant] || VARIANTS.default
  const isDark = variant === 'luxury'

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

  const svc = services.find(s=>s.id===form.service)
  const basePrice = svc?.price || 0
  const campaignDiscount = discount > 0 ? Math.round(basePrice * discount / 100) : 0
  const couponDiscount = couponApplied?.computed_discount ?? 0
  const total = Math.max(0, basePrice - campaignDiscount - couponDiscount)

  // Gün tamamen dolu mu? (slot listesi var, hepsi taken)
  const dayIsFull = !!form.date && !slotsLoading && availableSlots !== null && availableSlots.length > 0
    && availableSlots.every(t => takenSlots.includes(t))
  const dayIsClosed = availableSlots === null && !!form.date

  async function setAlarm() {
    if (!biz?.id || !form.date || !userId) {
      toast3?.(T('alarmSettingError'))
      return
    }
    setSettingAlarm(true)
    try {
      // Aynı gün için zaten alarm var mı?
      const { data: existing } = await supabase.from('waiting_list')
        .select('id').eq('business_id', biz.id).eq('profile_id', userId)
        .eq('preferred_date', form.date).eq('status', 'waiting').maybeSingle()
      if (!existing) {
        const { error } = await supabase.from('waiting_list').insert({
          business_id: biz.id, profile_id: userId,
          service_id: form.service || null,
          preferred_date: form.date,
          status: 'waiting',
        })
        if (error) throw error
      }
      setAlarmSet(true)
      toast3?.(T('alarmActive'))
    } catch (e) {
      toast3?.(T('alarmSettingError') + (e?.message?': '+e.message:''))
    } finally {
      setSettingAlarm(false)
    }
  }

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code || !biz?.id) return
    setCouponChecking(true)
    try {
      const amt = basePrice - campaignDiscount
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code,
        p_business_id: biz.id,
        p_amount: amt,
      })
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row?.valid) {
        toast3?.(T('couponInvalid'))
        return
      }
      setCouponApplied({
        id: row.coupon_id,
        code: row.code,
        pct: row.discount_pct,
        amount: row.discount_amount,
        computed_discount: Number(row.computed_discount) || 0,
      })
      toast3?.(T('couponApplied') + ': ' + row.code)
    } catch {
      toast3?.(T('couponInvalid'))
    } finally {
      setCouponChecking(false)
    }
  }

  const handleBook = async () => {
    if (!form.service||!form.date||!form.time) { toast3(T('selectRequired')); return }
    if (takenSlots.includes(form.time)) { toast3(T('slotTaken')); return }
    setBooking(true)
    await onBook({ ...form, total, campaignDiscount, couponDiscount, couponCode: couponApplied?.code, couponId: couponApplied?.id }, payCard)
    setBooking(false)
  }

  // Helpers
  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors'
  const inputStyle = { background: V.inputBg, color: V.ink, border: '1px solid '+V.border }
  const labelStyle = { color: V.muted, fontSize:'11px', fontWeight:700 }
  const optionStyle = { background: V.inputBg, color: V.ink }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{background: V.bg, color: V.ink, border: isDark ? '1px solid '+V.border : 'none'}}>
        {/* Header */}
        <div className="p-5 flex justify-between items-center" style={{borderBottom:'1px solid '+V.border}}>
          <div className="min-w-0">
            <div className="font-bold" style={{color:V.ink}}>{payStep?'💳 '+T('payTitle'):T('bookTitle')}</div>
            <div className="text-xs truncate" style={{color:V.muted}}>{biz.name}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{background:V.accent,color:isDark?'#000':'#fff'}}>1</div>
              <div className="h-px w-4" style={{background:V.border}}/>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={payStep?{background:V.accent,color:isDark?'#000':'#fff'}:{background:V.border,color:V.muted}}>2</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-colors"
              style={{color:V.muted,background:'transparent'}}>✕</button>
          </div>
        </div>

        {!payStep ? (
          <>
            <div className="p-5 space-y-3">
              <div>
                <label className="block mb-1" style={labelStyle}>{T('service')} *</label>
                <select className={inputCls} style={inputStyle}
                  value={form.service} onChange={e=>setForm(p=>({...p,service:e.target.value,time:''}))}>
                  <option value="" style={optionStyle}>{T('selectService')}</option>
                  {services.map(s=><option key={s.id} value={s.id} style={optionStyle}>{s.name} — ₺{s.price} ({s.duration_min} dk)</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>{T('staffField')}</label>
                <select className={inputCls} style={inputStyle}
                  value={form.staff} onChange={e=>setForm(p=>({...p,staff:e.target.value}))}>
                  <option value="" style={optionStyle}>{T('anyStaff')}</option>
                  {staff.map(s=><option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={labelStyle}>{T('date')} *</label>
                  <input type="date" className={inputCls} style={inputStyle}
                    min={new Date().toISOString().split('T')[0]} value={form.date}
                    onChange={e=>{setForm(p=>({...p,date:e.target.value,time:''})); loadTakenSlots(e.target.value); setAlarmSet(false)}}/>
                </div>
                <div>
                  <label className="block mb-1" style={labelStyle}>{T('time')}{slotsLoading&&<span className="font-normal opacity-60"> ...</span>}</label>
                  {availableSlots===null
                    ? <div className="px-3 py-2.5 rounded-xl text-sm font-semibold text-center" style={{background:'#fee2e2',color:'#dc2626',border:'1px solid #fecaca'}}>{T('closed')}</div>
                    : <select className={inputCls} style={inputStyle}
                        value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}
                        disabled={!form.date||slotsLoading||!form.service}>
                        <option value="" style={optionStyle}>{form.service?T('selectTime'):T('serviceFirst')}</option>
                        {(availableSlots||[]).map(t=><option key={t} value={t} disabled={takenSlots.includes(t)} style={optionStyle}>{t}{takenSlots.includes(t)?' — '+T('full'):''}</option>)}
                      </select>
                  }
                </div>
              </div>

              {/* Gün dolu → Alarm Kur paneli */}
              {(dayIsFull || dayIsClosed) && (
                <div className="rounded-xl p-3.5" style={{background:V.accent+'10',border:'1px dashed '+V.accent+'66'}}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🔔</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black mb-0.5" style={{color:V.accent}}>{T('dayFull')}</div>
                      <div className="text-xs leading-relaxed" style={{color:V.muted}}>{T('daySetAlarm')}</div>
                    </div>
                  </div>
                  {alarmSet ? (
                    <div className="mt-3 text-xs font-bold text-center py-2 rounded-lg" style={{background:'#dcfce7',color:'#15803d',border:'1px solid #86efac'}}>
                      {T('alarmActive')}
                    </div>
                  ) : (
                    <button onClick={setAlarm} disabled={settingAlarm || !userId}
                      className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{background:V.accent,color:isDark?'#000':'#fff'}}>
                      {settingAlarm ? T('loading') : T('setAlarm')}
                    </button>
                  )}
                </div>
              )}

              {/* Kampanya indirimi rozeti */}
              {discount > 0 && (
                <div className="flex items-center gap-2 rounded-xl p-2.5" style={{background:V.accent+'15',border:'1px solid '+V.accent+'44'}}>
                  <span className="text-lg">🎁</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{color:V.accent}}>{T('campaignDiscount')}</div>
                    <div className="text-[11px]" style={{color:V.muted}}>%{discount} {T('discount').toLowerCase()}</div>
                  </div>
                </div>
              )}

              {/* Kupon kodu */}
              <div>
                <label className="block mb-1" style={labelStyle}>🎟️ {T('couponCode')}</label>
                {couponApplied ? (
                  <div className="flex items-center gap-2 rounded-xl p-2.5" style={{background:'#dcfce7',border:'1px solid #86efac'}}>
                    <span className="font-bold text-sm" style={{color:'#15803d'}}>✓ {couponApplied.code}</span>
                    <span className="text-xs" style={{color:'#16a34a'}}>
                      {couponApplied.pct ? '−%'+couponApplied.pct : '−₺'+couponApplied.amount}
                    </span>
                    <button onClick={()=>{ setCouponApplied(null); setCouponInput('') }}
                      className="ml-auto text-xs font-bold" style={{color:'#15803d'}}>✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={e=>e.key==='Enter'&&applyCoupon()}
                      placeholder="HOSGELDIN" className={inputCls+' uppercase tracking-wider font-mono'} style={inputStyle}/>
                    <button onClick={applyCoupon} disabled={couponChecking}
                      className="px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{background:V.accent,color:isDark?'#000':'#fff'}}>{couponChecking ? '...' : T('apply')}</button>
                  </div>
                )}
              </div>

              {/* Mini summary — only if service selected */}
              {svc && (
                <div className="rounded-xl p-3 space-y-1 text-sm" style={{background:V.summary,border:'1px solid '+V.summaryBorder}}>
                  <div className="flex justify-between" style={{color:V.muted}}><span>{T('subtotal')}</span><span>₺{basePrice}</span></div>
                  {campaignDiscount > 0 && <div className="flex justify-between" style={{color:V.accent}}><span>{T('campaignDiscount')}</span><span>−₺{campaignDiscount}</span></div>}
                  {couponDiscount > 0 && <div className="flex justify-between" style={{color:V.accent}}><span>{T('couponDiscount')}</span><span>−₺{couponDiscount}</span></div>}
                  <div className="flex justify-between pt-1.5 font-bold" style={{borderTop:'1px solid '+V.border,color:V.ink}}>
                    <span>{T('total')}</span>
                    <span style={{color:V.accent,fontSize:'18px'}}>₺{total}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{border:'1px solid '+V.border,color:V.muted,background:'transparent'}}>{T('cancel')}</button>
              <button onClick={()=>{
                if(!form.service||!form.date){toast3(T('selectRequired'));return}
                if(!form.time){toast3(T('selectRequired'));return}
                if(takenSlots.includes(form.time)){toast3(T('slotTaken'));return}
                if(!paymentEnabled){ handleBook(); return }
                setPayStep(true)
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                 style={{background:V.accent,color:isDark?'#000':'#fff'}}>
                {paymentEnabled?T('continuePay'):T('bookTitle')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5">
              <div className="rounded-xl p-4 mb-4" style={{background:V.summary,border:'1px solid '+V.summaryBorder}}>
                <div className="text-xs font-bold mb-2" style={{color:V.accent}}>{T('summary')}</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between" style={{color:V.muted}}><span>{T('service')}</span><span className="font-semibold" style={{color:V.ink}}>{svc?.name}</span></div>
                  <div className="flex justify-between" style={{color:V.muted}}><span>{T('date')}</span><span className="font-semibold" style={{color:V.ink}}>{new Date(form.date).toLocaleDateString(uiLang==='en'?'en-GB':'tr-TR',{day:'numeric',month:'long'})}</span></div>
                  <div className="flex justify-between" style={{color:V.muted}}><span>{T('time')}</span><span className="font-semibold" style={{color:V.ink}}>{form.time}</span></div>
                  <div className="flex justify-between pt-1.5" style={{color:V.muted,borderTop:'1px solid '+V.border}}><span>{T('subtotal')}</span><span style={{color:V.ink}}>₺{basePrice}</span></div>
                  {campaignDiscount > 0 && <div className="flex justify-between" style={{color:V.accent}}><span>{T('campaignDiscount')}</span><span>−₺{campaignDiscount}</span></div>}
                  {couponDiscount > 0 && <div className="flex justify-between" style={{color:V.accent}}><span>{T('couponDiscount')} ({couponApplied.code})</span><span>−₺{couponDiscount}</span></div>}
                  <div className="flex justify-between pt-1.5 font-bold" style={{borderTop:'1px solid '+V.border,color:V.ink}}>
                    <span>{T('total')}</span><span style={{color:V.accent,fontSize:'18px'}}>₺{total}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <input placeholder="Card holder name" value={payCard.name} onChange={e=>setPayCard(p=>({...p,name:e.target.value}))}
                  className={inputCls+' uppercase tracking-wide'} style={inputStyle}/>
                <input placeholder="1234 5678 9012 3456" maxLength={19} value={payCard.number}
                  onChange={e=>setPayCard(p=>({...p,number:e.target.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim()}))}
                  className={inputCls+' font-mono tracking-widest'} style={inputStyle}/>
                <div className="grid grid-cols-2 gap-2.5">
                  <input placeholder="MM/YY" maxLength={5} value={payCard.expire}
                    onChange={e=>setPayCard(p=>({...p,expire:e.target.value.replace(/\D/g,'').replace(/(\d{2})/,'$1/').slice(0,5)}))}
                    className={inputCls+' font-mono'} style={inputStyle}/>
                  <input placeholder="CVV" maxLength={3} type="password" value={payCard.cvv}
                    onChange={e=>setPayCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,3)}))}
                    className={inputCls+' font-mono'} style={inputStyle}/>
                </div>
                <div className="text-xs flex items-center gap-1.5" style={{color:V.muted}}>🔒 256-bit SSL</div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setPayStep(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{border:'1px solid '+V.border,color:V.muted,background:'transparent'}}>{T('back')}</button>
              <button onClick={handleBook} disabled={booking}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{background:V.accent,color:isDark?'#000':'#fff'}}>
                {booking?T('bookingSaving'):T('bookAndPay')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
