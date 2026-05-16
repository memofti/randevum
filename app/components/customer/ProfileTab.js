'use client'
import { supabase } from '@/lib/supabase'
import { t as i18n } from '@/lib/i18n'

const TIERS = {
  bronze:  { key:'bronze',   emoji:'🥉', cls:'bg-orange-50 text-orange-700 border-orange-200' },
  silver:  { key:'silver',   emoji:'🥈', cls:'bg-gray-50 text-gray-600 border-gray-300' },
  gold:    { key:'gold',     emoji:'🥇', cls:'bg-amber-50 text-amber-700 border-amber-200' },
  platinum:{ key:'platinum', emoji:'💫', cls:'bg-purple-50 text-purple-700 border-purple-200' },
}

export default function ProfileTab({
  user, profile, profLoading, profileForm, setProfileForm,
  editProfile, setEditProfile, savingProfile, saveProfile,
  setProfile, requestPushPermission, uiLang='tr', setUiLang, toast3,
  appointments=[], upcomingAppts=[],
  variant = 'default', loyaltyEnabled = false,
}) {
  const T = (k, vars) => i18n(k, uiLang, vars)
  const isDark = variant === 'luxury'
  const accent = ({
    default:'#f97316', minimal:'#b04a3a', luxury:'#d4af37', soft:'#e85d8a', bold:'#1736ff',
  })[variant] || '#f97316'

  const cardCls = isDark
    ? 'rounded-2xl p-6 border'
    : 'bg-white border border-gray-200 rounded-2xl p-6 shadow-sm'
  const cardStyle = isDark ? { background:'#111', borderColor:'#222', color:'#fff' } : {}
  const subCardCls = isDark
    ? 'rounded-2xl p-4 border'
    : 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm'
  const subCardStyle = isDark ? { background:'#111', borderColor:'#222' } : {}
  const labelMuted = isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'

  if (profLoading || !profile) {
    return (
      <div className={'max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 '+(isDark?'text-white':'')}>
        <div className="flex items-center justify-center gap-3 py-16" style={{color:labelMuted}}>
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{borderColor:'rgba(150,150,150,0.3)',borderTopColor:accent}}/>
          {T('loading')}
        </div>
      </div>
    )
  }

  const tier = profile.loyalty_tier || 'bronze'
  const tinfo = TIERS[tier] || TIERS.bronze
  const points = profile.loyalty_points||0
  const pct = Math.min(100, Math.round(points/3000*100))

  const headingCls = variant==='luxury' ? 'text-3xl tracking-widest'
    : variant==='minimal' ? 'text-3xl tracking-tight font-bold'
    : variant==='bold' ? 'text-4xl tracking-tight font-black'
    : 'text-2xl font-extrabold'

  return (
    <div className={'max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 '+(isDark?'text-white':'')}>
      <h1 className={'mb-6 '+headingCls} style={isDark?{color:accent}:{}}>
        {variant==='luxury'?T('myProfile').toUpperCase():T('myProfile')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* SOL — kart sütunu */}
        <div className="space-y-4">
          <div className={cardCls+' text-center'} style={cardStyle}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-4"
              style={{background:accent,color:isDark?'#000':'#fff',border:'4px solid '+(isDark?'#1a1a1a':accent+'22')}}>
              {profile.full_name?.[0]||'?'}
            </div>
            <div className="font-bold text-lg mb-1" style={isDark?{color:'#fff'}:{}}>{profile.full_name}</div>
            <div className="text-sm mb-3 truncate" style={{color:labelMuted}}>{profile.email}</div>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tinfo.cls}`}>{tinfo.emoji} {T(tinfo.key)}</span>
            </div>
            <button onClick={()=>setEditProfile(true)}
              className={'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors '+(isDark?'border border-white/20 hover:bg-white/5':'border border-gray-200 hover:bg-gray-50')}>
              ✏️ {T('editProfile')}
            </button>
          </div>

          <div className={subCardCls} style={subCardStyle}>
            {[[T('phone'), profile.phone||'—'], [T('memberSince'), new Date(profile.created_at).toLocaleDateString(uiLang==='en'?'en-GB':'tr-TR')]].map(([l,v])=>(
              <div key={l} className={'flex justify-between py-2.5 '+(isDark?'border-b border-white/10':'border-b border-gray-100')+' last:border-0'}>
                <span className="text-sm" style={{color:labelMuted}}>{l}</span>
                <span className="text-sm font-semibold" style={isDark?{color:'#fff'}:{}}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }}
            className={'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors '+(isDark?'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10':'bg-gray-100 hover:bg-gray-200 text-gray-600')}>
            🚪 {T('logout')}
          </button>

          {/* KVKK — Hesabı sil */}
          <button onClick={async()=>{
            const c1 = window.confirm(uiLang==='en'
              ? 'This will PERMANENTLY delete your account and ALL data (appointments, reviews, points). Continue?'
              : 'Hesabınız ve TÜM verileriniz (randevular, yorumlar, puanlar) kalıcı olarak silinecek. Devam etmek istiyor musunuz?')
            if (!c1) return
            const c2 = window.prompt(uiLang==='en' ? 'Type DELETE to confirm:' : 'Onaylamak için SİL yazın:')
            if (c2 !== (uiLang==='en' ? 'DELETE' : 'SİL')) return
            try {
              const { error } = await supabase.rpc('delete_my_account')
              if (error) throw error
              await supabase.auth.signOut()
              localStorage.removeItem('randevu_user')
              window.location.href = '/login'
            } catch(e) {
              toast3?.('❌ '+e.message)
            }
          }} className={'w-full mt-2 py-2.5 rounded-xl text-xs font-semibold transition-colors '+(isDark?'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30':'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200')}>
            🗑️ {uiLang==='en' ? 'Delete my account' : 'Hesabımı sil (KVKK)'}
          </button>
        </div>

        {/* SAĞ — sadakat hero + ayarlar */}
        <div className="md:col-span-2 space-y-4">
          {/* Sadakat hero kartı — sadece loyalty_enabled açıkken */}
          {loyaltyEnabled && (
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-lg"
            style={{background:variant==='luxury'?'linear-gradient(135deg,#d4af37,#b8941f)':variant==='soft'?'linear-gradient(135deg,#e85d8a,#9b5cb8)':variant==='minimal'?'linear-gradient(135deg,#b04a3a,#5d6d3e)':variant==='bold'?'linear-gradient(135deg,#1736ff,#0f24c4)':'linear-gradient(135deg,#f97316,#ea580c)'}}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"/>
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-bold tracking-widest opacity-80 uppercase">{T('totalPoints')}</div>
                <div className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)'}}>{tinfo.emoji} {T(tinfo.key)}</div>
              </div>
              <div className="text-5xl sm:text-6xl font-extrabold leading-none mb-2" style={{letterSpacing:'-0.03em'}}>
                {points.toLocaleString(uiLang==='en'?'en-US':'tr-TR')}
              </div>
              <div className="text-sm opacity-90 mb-4">{T('discountWorth', {x:Math.floor(points/10)})}</div>
              <div className="flex justify-between text-xs opacity-80 mb-1.5">
                <span>{T('pointsToNext', {x:Math.max(0,3000-points)})}</span>
                <span>{points}/3.000</span>
              </div>
              <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{width:pct+'%'}}/>
              </div>
            </div>
          </div>
          )}

          {/* Stat sayıları */}
          <div className="grid grid-cols-3 gap-3">
            {[
              [T('totalAppts'), appointments.length, accent],
              [T('completedAppts'), appointments.filter(a=>a.status==='completed').length, '#10b981'],
              [T('upcomingAppts'), upcomingAppts.length, '#f59e0b'],
            ].map(([l,v,c])=>(
              <div key={l} className={subCardCls+' text-center'} style={subCardStyle}>
                <div className="text-3xl font-extrabold mb-1" style={{color:c,letterSpacing:'-0.02em'}}>{v}</div>
                <div className="text-xs font-semibold" style={{color:labelMuted}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Bildirim kartı */}
          <div className={cardCls+' space-y-3'} style={cardStyle}>
            <div className="font-bold mb-1" style={isDark?{color:accent}:{color:'#111'}}>🔔 {T('notifications')}</div>
            <button onClick={requestPushPermission}
              className={'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors '+(isDark?'bg-white/5 hover:bg-white/10 text-white border border-white/10':'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200')}>
              🔔 {T('enableBrowserNotifs')}
            </button>

            <div className={'rounded-xl p-3 space-y-2 '+(isDark?'border border-white/10 bg-white/5':'bg-gray-50 border border-gray-200')}>
              <div className="text-xs font-bold" style={isDark?{color:'rgba(255,255,255,0.7)'}:{color:'#4b5563'}}>📱 {T('smsNotifs')}</div>
              {profile?.sms_unsubscribed ? (
                <>
                  <div className="text-xs text-red-400">{T('smsUnsubscribed')}</div>
                  <button onClick={async()=>{
                    await supabase.from('profiles').update({sms_unsubscribed:false,sms_unsubscribed_at:null,sms_consent:true,sms_consent_at:new Date().toISOString()}).eq('id',user.id)
                    setProfile(p=>({...p,sms_unsubscribed:false,sms_consent:true}))
                    toast3('✅ '+T('smsActiveOK'))
                  }} className="w-full py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-lg text-xs font-semibold">
                    {T('resubscribe')}
                  </button>
                </>
              ) : profile?.sms_consent ? (
                <>
                  <div className="text-xs text-green-500">{T('smsActiveOK')}</div>
                  <button onClick={async()=>{
                    if(!window.confirm(uiLang==='en'?'Are you sure you want to unsubscribe from SMS notifications?':'SMS bildirimlerinden çıkmak istediğinize emin misiniz?')) return
                    await supabase.from('profiles').update({sms_unsubscribed:true,sms_unsubscribed_at:new Date().toISOString(),sms_consent:false}).eq('id',user.id)
                    setProfile(p=>({...p,sms_unsubscribed:true,sms_consent:false}))
                    toast3(T('smsUnsubscribed'))
                  }} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold">
                    {T('unsubscribe')}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs leading-relaxed" style={{color:labelMuted}}>{T('smsConsentText')}</div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" id="sms-consent" className="mt-0.5" style={{accentColor:accent}}/>
                    <span className="text-xs leading-relaxed" style={{color:labelMuted}}>{T('smsKVKK')}</span>
                  </label>
                  <button onClick={async()=>{
                    const cb = document.getElementById('sms-consent')
                    if(!cb?.checked){ toast3(uiLang==='en'?'❌ Please check the consent box':'❌ Lütfen KVKK onayını işaretleyin'); return }
                    await supabase.from('profiles').update({sms_consent:true,sms_consent_at:new Date().toISOString(),sms_unsubscribed:false}).eq('id',user.id)
                    setProfile(p=>({...p,sms_consent:true,sms_unsubscribed:false}))
                    toast3('✅ '+T('smsActiveOK'))
                  }} className="w-full py-2 text-white rounded-lg text-xs font-bold" style={{background:accent}}>
                    {T('consent')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Dil seçici */}
          <div className={cardCls+' space-y-3'} style={cardStyle}>
            <div className="font-bold" style={isDark?{color:accent}:{color:'#111'}}>🌐 {T('language')}</div>
            <div className="flex gap-2">
              {['tr','en'].map(l=>(
                <button key={l} onClick={()=>{ localStorage.setItem('lang',l); setUiLang?.(l) }}
                  className={'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all '+
                    (uiLang===l ? '' : (isDark?'bg-white/5 text-white/60 border-white/10':'bg-gray-50 text-gray-600 border-gray-200'))}
                  style={uiLang===l?{background:accent,color:isDark?'#000':'#fff',borderColor:accent}:{}}>
                  {l==='tr'?'🇹🇷 Türkçe':'🇬🇧 English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setEditProfile(false)}>
          <div className={'rounded-2xl w-full max-w-sm shadow-2xl '+(isDark?'border':'bg-white')} style={isDark?{background:'#111',borderColor:'#222'}:{}}>
            <div className={'p-5 border-b flex justify-between items-center '+(isDark?'border-white/10':'border-gray-100')}>
              <div className={'font-bold '+(isDark?'text-white':'')}>{T('editProfile')}</div>
              <button onClick={()=>setEditProfile(false)} className={'w-7 h-7 flex items-center justify-center rounded-lg '+(isDark?'hover:bg-white/10 text-white/40':'hover:bg-gray-100 text-gray-400')}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className={'text-xs font-bold block mb-1 '+(isDark?'text-white/60':'')}>{T('fullName')} *</label>
                <input value={profileForm.full_name} onChange={e=>setProfileForm(p=>({...p,full_name:e.target.value}))}
                  className={'w-full px-3 py-2.5 rounded-xl text-sm outline-none '+(isDark?'bg-white/5 border border-white/10 text-white':'border border-gray-200 focus:border-orange-400')} />
              </div>
              <div>
                <label className={'text-xs font-bold block mb-1 '+(isDark?'text-white/60':'')}>{T('phone')}</label>
                <input value={profileForm.phone} onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))}
                  placeholder="+90 555 000 00 00"
                  className={'w-full px-3 py-2.5 rounded-xl text-sm outline-none '+(isDark?'bg-white/5 border border-white/10 text-white':'border border-gray-200 focus:border-orange-400')} />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setEditProfile(false)} className={'flex-1 py-2.5 rounded-xl text-sm font-semibold '+(isDark?'border border-white/10 text-white/70 hover:bg-white/5':'border border-gray-200 hover:bg-gray-50')}>{T('cancel')}</button>
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                style={{background:accent}}>
                {savingProfile?T('saving'):T('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
