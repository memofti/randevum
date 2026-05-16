'use client'
import { t as i18n } from '@/lib/i18n'

function statusBadge(s, isDark, T) {
  const map = {
    confirmed:{ l:T('confirmed'),   cls:isDark?'bg-green-500/10 text-green-400 border-green-500/30':'bg-green-50 text-green-700 border-green-200' },
    pending:  { l:T('pending'), cls:isDark?'bg-amber-500/10 text-amber-400 border-amber-500/30':'bg-amber-50 text-amber-700 border-amber-200' },
    completed:{ l:T('completed'),  cls:isDark?'bg-white/5 text-white/60 border-white/10':'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled:{ l:T('cancelled'),       cls:isDark?'bg-red-500/10 text-red-400 border-red-500/30':'bg-red-50 text-red-600 border-red-200' },
  }
  return map[s] || map.completed
}

function groupByBusiness(items, isPast) {
  const groups = {}
  items.forEach(a => {
    const k = a.business_id
    if (!groups[k]) groups[k] = { business_id: k, biz: a.businesses, appts: [] }
    groups[k].appts.push(a)
  })
  // Randevuları içeride tarihe göre sırala (yakın→uzak / yeni→eski)
  Object.values(groups).forEach(g => g.appts.sort((a,b) => {
    const da = new Date(a.appointment_date+'T'+a.appointment_time)
    const db = new Date(b.appointment_date+'T'+b.appointment_time)
    return isPast ? db - da : da - db
  }))
  // Grupları en erken (upcoming) / en geç (past) randevu tarihine göre sırala
  return Object.values(groups).sort((g1, g2) => {
    const d1 = new Date(g1.appts[0].appointment_date+'T'+g1.appts[0].appointment_time)
    const d2 = new Date(g2.appts[0].appointment_date+'T'+g2.appts[0].appointment_time)
    return isPast ? d2 - d1 : d1 - d2
  })
}

export default function AppointmentsTab({
  upcomingAppts, pastAppts, cancelAppt, rescheduleAppt,
  setReviewModal, setReviewForm, setQrModal, setTab,
  uiLang='tr',
  variant = 'default',
}) {
  const T = (k) => i18n(k, uiLang)
  const isDark = variant === 'luxury'
  const accent = ({
    default:'#f97316', minimal:'#b04a3a', luxury:'#d4af37', soft:'#e85d8a', bold:'#1736ff',
  })[variant] || '#f97316'
  const cardCls = isDark
    ? 'rounded-2xl p-5 border hover:bg-white/[0.03] transition-colors'
    : 'bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow'
  const cardStyle = isDark ? { background:'#111', borderColor:'#222', color:'#fff' } : {}
  const muted = isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'
  const rowDivider = isDark ? 'border-white/10' : 'border-gray-100'

  if ((upcomingAppts||[]).length === 0 && (pastAppts||[]).length === 0) {
    return (
      <div className={'max-w-2xl mx-auto px-4 sm:px-6 py-8 '+(isDark?'text-white':'')}>
        <h1 className={'font-extrabold mb-6 '+(variant==='luxury'?'text-3xl tracking-widest':'text-2xl')} style={isDark?{color:accent}:{}}>
          {variant==='luxury'?T('myAppointments').toUpperCase():T('myAppointments')}
        </h1>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📅</div>
          <div className="font-bold mb-4" style={{color:muted}}>{T('noAppointments')}</div>
          <button onClick={()=>setTab?.('home')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{background:accent,color:isDark?'#000':'#fff'}}>
            {T('findBiz')}
          </button>
        </div>
      </div>
    )
  }

  const ApptRow = ({ a, isPast }) => {
    const b = statusBadge(a.status, isDark, T)
    return (
      <div className={'flex items-start gap-3 py-3 border-t '+rowDivider}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={isDark?{color:'#fff'}:{}}>{a.services?.name||'—'}</div>
          <div className="text-xs mt-0.5" style={{color:muted}}>
            📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})}
            {' · ⏰ '}{String(a.appointment_time).slice(0,5)}
            {a.staff?.name && ` · 👤 ${a.staff.name}`}
            {a.price>0 && ` · ₺${a.price}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${b.cls}`}>{b.l}</span>
          <div className="flex gap-1 flex-wrap justify-end">
            {!isPast && a.status !== 'cancelled' && setQrModal && a.qr_token && (
              <button onClick={()=>setQrModal(a)} title={T('qrCode')}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30':'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200')}>📲 QR</button>
            )}
            {!isPast && ['pending','confirmed'].includes(a.status) && rescheduleAppt && (
              <button onClick={()=>rescheduleAppt(a)} title={uiLang==='en'?'Reschedule':'Taşı'}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30':'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200')}>📆 {uiLang==='en'?'Reschedule':'Taşı'}</button>
            )}
            {!isPast && ['pending','confirmed'].includes(a.status) && (
              <button onClick={()=>{ if(window.confirm(uiLang==='en'?'Are you sure you want to cancel?':'Randevuyu iptal etmek istediğinize emin misiniz?')) cancelAppt?.(a.id) }} title={T('cancelAppt')}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30':'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200')}>✗ {T('cancelAppt')}</button>
            )}
            {isPast && a.status === 'completed' && (
              <a href={'/fatura/'+a.id} target="_blank" rel="noopener noreferrer" title={T('invoice')}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10':'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200')}>
                🧾 {T('invoice')}
              </a>
            )}
            {isPast && a.status === 'completed' && setReviewModal && (
              <button onClick={()=>{ setReviewForm?.({rating:5,comment:''}); setReviewModal(a) }}
                className={'text-xs px-2 py-1 rounded-md font-bold border '+(isDark?'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20':'text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100')}>
                ⭐ {T('review')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const Section = ({ title, items, isPast }) => {
    if (items.length === 0) return null
    const groups = groupByBusiness(items, isPast)
    return (
      <div className="mb-7">
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:muted}}>{title} ({items.length})</div>
        <div className="space-y-3">
          {groups.map(g => {
            const biz = g.biz
            const dirQ = biz?.lat && biz?.lng
              ? `${biz.lat},${biz.lng}`
              : encodeURIComponent([biz?.name, biz?.address, biz?.city].filter(Boolean).join(' '))
            const dirUrl = `https://www.google.com/maps/search/?api=1&query=${dirQ}`
            return (
              <div key={g.business_id} className={cardCls} style={cardStyle}>
                {/* Firma başlığı */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:isDark?'#1a1a1a':'#f3f4f6'}}>{biz?.emoji||'🏢'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base truncate" style={isDark?{color:'#fff'}:{}}>{biz?.name||'—'}</div>
                    <div className="text-xs truncate" style={{color:muted}}>
                      {[biz?.address, biz?.city].filter(Boolean).join(' · ') || '—'}
                      {g.appts.length>1 && <span style={{color:accent}}> · {g.appts.length} randevu</span>}
                    </div>
                  </div>
                  {biz && (biz.lat || biz.address || biz.name) && (
                    <a href={dirUrl} target="_blank" rel="noopener noreferrer" title={T('directions')}
                      className={'text-xs px-2 py-1 rounded-md font-bold flex-shrink-0 '+(isDark?'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30':'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200')}>
                      🗺️ {T('directions')}
                    </a>
                  )}
                </div>
                {/* Randevu listesi */}
                <div className="mt-2">
                  {g.appts.map(a => <ApptRow key={a.id} a={a} isPast={isPast} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={'max-w-2xl mx-auto px-4 sm:px-6 py-8 '+(isDark?'text-white':'')}>
      <h1 className={'font-extrabold mb-6 '+(variant==='luxury'?'text-3xl tracking-widest':'text-2xl')} style={isDark?{color:accent}:{}}>
        {variant==='luxury'?T('myAppointments').toUpperCase():T('myAppointments')}
      </h1>
      <Section title={T('upcoming')} items={upcomingAppts||[]} isPast={false} />
      <Section title={T('past')} items={pastAppts||[]} isPast={true} />
    </div>
  )
}
