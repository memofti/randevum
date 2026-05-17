'use client'
import { useState } from 'react'
import { t as i18n } from '@/lib/i18n'

function timeUntil(dateStr, timeStr, uiLang) {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr + 'T' + (timeStr||'00:00'))
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tDate = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const diffDays = Math.round((tDate - today) / 86400000)
  if (diffDays < 0) return null
  if (diffDays === 0) return uiLang==='en' ? 'Today' : 'Bugün'
  if (diffDays === 1) return uiLang==='en' ? 'Tomorrow' : 'Yarın'
  if (diffDays <= 7) return uiLang==='en' ? `${diffDays} days` : `${diffDays} gün`
  return null
}

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
  Object.values(groups).forEach(g => g.appts.sort((a,b) => {
    const da = new Date(a.appointment_date+'T'+a.appointment_time)
    const db = new Date(b.appointment_date+'T'+b.appointment_time)
    return isPast ? db - da : da - db
  }))
  return Object.values(groups).sort((g1, g2) => {
    const d1 = new Date(g1.appts[0].appointment_date+'T'+g1.appts[0].appointment_time)
    const d2 = new Date(g2.appts[0].appointment_date+'T'+g2.appts[0].appointment_time)
    return isPast ? d2 - d1 : d1 - d2
  })
}

export default function AppointmentsTab({
  upcomingAppts, pastAppts, cancelAppt, rescheduleAppt,
  setReviewModal, setReviewForm, setQrModal, setTab, openDetail, businesses,
  uiLang='tr',
  variant = 'default',
}) {
  const T = (k) => i18n(k, uiLang)
  const isDark = variant === 'luxury'
  const accent = ({
    default:'#f97316', minimal:'#b04a3a', luxury:'#d4af37', soft:'#e85d8a', bold:'#1736ff',
  })[variant] || '#f97316'
  const ink = isDark ? '#fff' : '#0a0a0a'
  const muted = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const [pastOpen, setPastOpen] = useState(false)

  // Upcoming — vivid, accent-stripped
  const upcomingCardCls = isDark
    ? 'rounded-2xl p-5 border hover:bg-white/[0.03] transition-colors'
    : 'bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow'
  const upcomingCardStyle = isDark
    ? { background:'#111', borderColor:'#222', color:'#fff', borderLeft:'3px solid '+accent }
    : { color:'#0a0a0a', borderLeft:'3px solid '+accent }
  const upcomingSubBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb'
  const upcomingSubBorder = isDark ? 'rgba(255,255,255,0.08)' : '#eef0f3'

  // Past — muted, compact, archive feel
  const pastCardCls = isDark
    ? 'rounded-xl p-3.5 border'
    : 'border border-gray-100 rounded-xl p-3.5'
  const pastCardStyle = isDark
    ? { background:'#0c0c0c', borderColor:'#191919', color:'rgba(255,255,255,0.65)' }
    : { background:'#fafbfc', color:'#4b5563' }
  const pastSubBg = isDark ? 'rgba(255,255,255,0.02)' : '#ffffff'
  const pastSubBorder = isDark ? 'rgba(255,255,255,0.05)' : '#eef0f3'

  if ((upcomingAppts||[]).length === 0 && (pastAppts||[]).length === 0) {
    return (
      <div className={'max-w-2xl mx-auto px-4 sm:px-6 py-8 '+(isDark?'text-white':'')}>
        <h1 className={'font-extrabold mb-6 '+(variant==='luxury'?'text-3xl tracking-widest':'text-2xl')} style={isDark?{color:accent}:{}}>
          {variant==='luxury'?T('myAppointments').toUpperCase():T('myAppointments')}
        </h1>
        <div className="text-center py-16">
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
    const countdown = !isPast && a.status !== 'cancelled' ? timeUntil(a.appointment_date, a.appointment_time, uiLang) : null
    const subBg = isPast ? pastSubBg : upcomingSubBg
    const subBorder = isPast ? pastSubBorder : upcomingSubBorder
    const labelMuted = isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'
    return (
      <div className={'flex items-start gap-3 rounded-lg '+(isPast?'p-2.5':'p-3')}
        style={{ background: subBg, border: '1px solid '+subBorder }}>
        <div className="flex-1 min-w-0">
          <div className={(isPast?'text-xs font-semibold':'text-sm font-bold')+' truncate'} style={{color:isPast?(isDark?'rgba(255,255,255,0.75)':'#374151'):ink}}>{a.services?.name||'—'}</div>
          <div className={(isPast?'text-[11px]':'text-xs')+' mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5'} style={{color:muted}}>
            <span>{new Date(a.appointment_date).toLocaleDateString(uiLang==='en'?'en-US':'tr-TR',{day:'numeric',month:'short',year:'numeric'})}</span>
            <span style={{color:labelMuted}}>·</span>
            <span>{String(a.appointment_time).slice(0,5)}</span>
            {a.staff?.name && (<>
              <span style={{color:labelMuted}}>·</span>
              <span>{a.staff.name}</span>
            </>)}
            {a.price>0 && (<>
              <span style={{color:labelMuted}}>·</span>
              <span>₺{a.price}</span>
            </>)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {countdown && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{background:accent,color:isDark?'#000':'#fff'}}>{countdown}</span>
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${b.cls}`}>{b.l}</span>
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {!isPast && a.status !== 'cancelled' && setQrModal && a.qr_token && (
              <button onClick={()=>setQrModal(a)} title={T('qrCode')}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30':'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200')}>{T('qrCode')}</button>
            )}
            {!isPast && ['pending','confirmed'].includes(a.status) && rescheduleAppt && (
              <button onClick={()=>rescheduleAppt(a)} title={uiLang==='en'?'Reschedule':'Taşı'}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30':'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200')}>{uiLang==='en'?'Reschedule':'Taşı'}</button>
            )}
            {!isPast && ['pending','confirmed'].includes(a.status) && (
              <button onClick={()=>{ if(window.confirm(uiLang==='en'?'Are you sure you want to cancel?':'Randevuyu iptal etmek istediğinize emin misiniz?')) cancelAppt?.(a.id) }} title={T('cancelAppt')}
                className={'text-xs px-2 py-1 rounded-md font-bold '+(isDark?'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30':'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200')}>{T('cancelAppt')}</button>
            )}
            {isPast && a.status === 'completed' && (
              <a href={'/fatura/'+a.id} target="_blank" rel="noopener noreferrer" title={T('invoice')}
                className={'text-[11px] px-2 py-1 rounded-md font-bold '+(isDark?'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10':'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200')}>
                {T('invoice')}
              </a>
            )}
            {isPast && a.status === 'completed' && setReviewModal && (
              <button onClick={()=>{ setReviewForm?.({rating:5,comment:''}); setReviewModal(a) }}
                className={'text-[11px] px-2 py-1 rounded-md font-bold border '+(isDark?'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20':'text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100')}>
                {T('review')}
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
    const groupCardCls = isPast ? pastCardCls : upcomingCardCls
    const groupCardStyle = isPast ? pastCardStyle : upcomingCardStyle
    const bizNameSize = isPast ? 'text-sm' : 'text-base'
    const bizBox = isPast ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
    const bizNameColor = isPast ? (isDark?'rgba(255,255,255,0.8)':'#374151') : ink
    const renderList = (
      <div className="space-y-3">
        {groups.map(g => {
          const biz = g.biz
          const dirQ = biz?.lat && biz?.lng
            ? `${biz.lat},${biz.lng}`
            : encodeURIComponent([biz?.name, biz?.address, biz?.city].filter(Boolean).join(' '))
          const dirUrl = `https://www.google.com/maps/search/?api=1&query=${dirQ}`
          const initials = (biz?.name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
          return (
            <div key={g.business_id} className={groupCardCls} style={groupCardStyle}>
              {/* Firma başlığı */}
              <div className="flex items-center gap-3">
                <button
                  onClick={()=>{
                    if (!openDetail) return
                    const full = (businesses||[]).find(x => x.id === g.business_id)
                    openDetail(full || { id: g.business_id, ...biz })
                  }}
                  disabled={!openDetail}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left -m-1 p-1 rounded-lg transition-colors hover:bg-black/[0.04] disabled:hover:bg-transparent">
                  <div className={'rounded-xl flex items-center justify-center flex-shrink-0 font-bold '+bizBox}
                    style={{background:isDark?'#1a1a1a':'#f3f4f6',color:isDark?'rgba(255,255,255,0.7)':'#4b5563'}}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className={'font-bold truncate flex items-center gap-1.5 '+bizNameSize} style={{color:bizNameColor}}>
                      {biz?.name||'—'}
                      {openDetail && biz && <span className="text-xs font-semibold" style={{color:accent}}>›</span>}
                    </div>
                    <div className="text-xs truncate" style={{color:muted}}>
                      {[biz?.address, biz?.city].filter(Boolean).join(' · ') || '—'}
                      {g.appts.length>1 && <span style={{color:accent}}> · {g.appts.length} randevu</span>}
                    </div>
                  </div>
                </button>
                {!isPast && biz && (biz.lat || biz.address || biz.name) && (
                  <a href={dirUrl} target="_blank" rel="noopener noreferrer" title={T('directions')}
                    className={'text-xs px-2 py-1 rounded-md font-bold flex-shrink-0 '+(isDark?'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30':'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200')}>
                    {T('directions')}
                  </a>
                )}
              </div>
              {/* Randevu listesi */}
              <div className={(isPast?'mt-2 space-y-1.5':'mt-3 space-y-2')}>
                {g.appts.map(a => <ApptRow key={a.id} a={a} isPast={isPast} />)}
              </div>
            </div>
          )
        })}
      </div>
    )

    if (isPast) {
      return (
        <div className="mb-7">
          <button onClick={()=>setPastOpen(o=>!o)}
            className={'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all '+(pastOpen?'mb-3':'mb-0')+' '+(isDark?'hover:border-white/20':'hover:border-gray-300 hover:shadow-sm')}
            style={isDark?{background:'#0c0c0c',borderColor:'#1f1f1f'}:{background:'#f3f4f6',borderColor:'#e5e7eb'}}
            aria-expanded={pastOpen}>
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider" style={{color:isDark?'rgba(255,255,255,0.7)':'#374151'}}>
                {title}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:isDark?'rgba(255,255,255,0.08)':'#e5e7eb',color:isDark?'rgba(255,255,255,0.7)':'#4b5563'}}>{items.length}</span>
            </span>
            <span className="text-xs font-bold transition-transform inline-block" style={{color:muted, transform:pastOpen?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
          </button>
          {pastOpen && renderList}
        </div>
      )
    }

    return (
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{color:accent}}>{title}</span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{background:accent,color:isDark?'#000':'#fff'}}>{items.length}</span>
        </div>
        {renderList}
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
