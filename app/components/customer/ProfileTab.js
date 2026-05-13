'use client'
import { supabase } from '@/lib/supabase'

const TIERS = {
  bronze:  { label:'Bronze',   emoji:'🥉', cls:'bg-orange-50 text-orange-700 border-orange-200' },
  silver:  { label:'Silver',   emoji:'🥈', cls:'bg-gray-50 text-gray-600 border-gray-300' },
  gold:    { label:'Gold',     emoji:'🥇', cls:'bg-amber-50 text-amber-700 border-amber-200' },
  platinum:{ label:'Platinum', emoji:'💫', cls:'bg-purple-50 text-purple-700 border-purple-200' },
}

// Stil varyantı tema'ya göre değişir (light/dark/soft/bold)
export default function ProfileTab({
  user, profile, profLoading, profileForm, setProfileForm,
  editProfile, setEditProfile, savingProfile, saveProfile,
  setProfile, requestPushPermission, uiLang, setUiLang, toast3,
  variant = 'default',  // 'default' | 'luxury' | 'minimal' | 'soft' | 'bold'
}) {
  const isDark = variant === 'luxury'
  const accent = ({
    default:'#f97316', minimal:'#111827', luxury:'#d4af37', soft:'#f472b6', bold:'#a855f7',
  })[variant] || '#f97316'

  const cardCls = isDark
    ? 'rounded-2xl p-6 border'
    : 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm'
  const cardStyle = isDark
    ? { background:'#111', borderColor:'#222', color:'#fff' }
    : {}
  const subCardCls = isDark
    ? 'rounded-xl p-4 border'
    : 'bg-white border border-gray-200 rounded-xl p-4 shadow-sm'
  const subCardStyle = isDark ? { background:'#111', borderColor:'#222' } : {}
  const labelMuted = isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'

  if (profLoading || !profile) {
    return (
      <div className={'max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 '+(isDark?'text-white':'')}>
        <div className="flex items-center justify-center gap-3 py-16" style={{color:labelMuted}}>
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{borderColor:'rgba(150,150,150,0.3)',borderTopColor:accent}}/>
          Yükleniyor...
        </div>
      </div>
    )
  }

  const tier = profile.loyalty_tier || 'bronze'
  const t = TIERS[tier] || TIERS.bronze
  const pct = Math.min(100, Math.round((profile.loyalty_points||0)/3000*100))

  return (
    <div className={'max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 '+(isDark?'text-white':'')}>
      <h1 className={'font-extrabold mb-6 '+(variant==='luxury'?'text-3xl tracking-widest':variant==='minimal'?'text-3xl tracking-tight':'text-2xl')}
          style={isDark?{color:accent}:{}}>{variant==='luxury'?'PROFİLİM':'Profilim'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sol kolon — avatar + bilgi */}
        <div className="space-y-4">
          <div className={cardCls+' text-center'} style={cardStyle}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-4 border-4"
              style={{background:accent,color:isDark?'#000':'#fff',borderColor:isDark?'#1a1a1a':accent+'22'}}>
              {profile.full_name?.[0]||'?'}
            </div>
            <div className="font-bold text-lg mb-1" style={isDark?{color:'#fff'}:{}}>{profile.full_name}</div>
            <div className="text-sm mb-3" style={{color:labelMuted}}>{profile.email}</div>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${t.cls}`}>{t.emoji} {t.label}</span>
            </div>
            <button onClick={()=>setEditProfile(true)}
              className={'w-full py-2 rounded-xl text-sm font-semibold transition-colors '+(isDark?'border border-white/20 hover:bg-white/5':'border border-gray-200 hover:bg-gray-50')}>
              ✏️ Profili Düzenle
            </button>
          </div>

          <div className={subCardCls} style={subCardStyle}>
            {[['Telefon', profile.phone||'—'], ['Üye Tarihi', new Date(profile.created_at).toLocaleDateString('tr-TR')]].map(([l,v])=>(
              <div key={l} className={'flex justify-between py-2.5 '+(isDark?'border-b border-white/10':'border-b border-gray-100')+' last:border-0'}>
                <span className="text-sm" style={{color:labelMuted}}>{l}</span>
                <span className="text-sm font-semibold" style={isDark?{color:'#fff'}:{}}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }}
            className={'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors '+(isDark?'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10':'bg-gray-100 hover:bg-gray-200 text-gray-600')}>
            🚪 Çıkış Yap
          </button>
        </div>

        {/* Sağ — sadakat + ayarlar */}
        <div className="md:col-span-2 space-y-4">
          {/* Sadakat puanı */}
          <div className={cardCls} style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold" style={isDark?{color:accent}:{}}>🏅 Sadakat Puanı</div>
              <div className="text-2xl font-extrabold" style={{color:accent}}>{profile.loyalty_points||0}</div>
            </div>
            <div className={'w-full h-2.5 rounded-full overflow-hidden '+(isDark?'bg-white/10':'bg-gray-100')}>
              <div className="h-full rounded-full" style={{width:pct+'%',background:accent}}/>
            </div>
            <div className="text-xs mt-2" style={{color:labelMuted}}>Sonraki seviyeye {Math.max(0,3000-(profile.loyalty_points||0))} puan</div>
          </div>

          {/* Bildirim + SMS */}
          <div className={cardCls+' space-y-3'} style={cardStyle}>
            <div className="font-bold mb-1" style={isDark?{color:'#fff'}:{}}>🔔 Bildirimler</div>
            <button onClick={requestPushPermission}
              className={'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors '+(isDark?'bg-white/5 hover:bg-white/10 text-white border border-white/10':'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200')}>
              🔔 Tarayıcı Bildirimlerini Aç
            </button>

            <div className={'rounded-xl p-3 space-y-2 '+(isDark?'border border-white/10 bg-white/5':'bg-gray-50 border border-gray-200')}>
              <div className="text-xs font-bold" style={isDark?{color:'rgba(255,255,255,0.7)'}:{color:'#4b5563'}}>📱 SMS Bildirimleri</div>
              {profile?.sms_unsubscribed ? (
                <>
                  <div className="text-xs text-red-400">SMS bildirimlerinden çıkış yapıldı.</div>
                  <button onClick={async()=>{
                    await supabase.from('profiles').update({sms_unsubscribed:false,sms_unsubscribed_at:null,sms_consent:true,sms_consent_at:new Date().toISOString()}).eq('id',user.id)
                    setProfile(p=>({...p,sms_unsubscribed:false,sms_consent:true}))
                    toast3('✅ SMS bildirimleri yeniden aktif')
                  }} className="w-full py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-lg text-xs font-semibold">
                    ✓ Yeniden Abone Ol
                  </button>
                </>
              ) : profile?.sms_consent ? (
                <>
                  <div className="text-xs text-green-500">✅ SMS bildirimlerine onay verildi.</div>
                  <button onClick={async()=>{
                    if(!window.confirm('SMS bildirimlerinden çıkmak istediğinize emin misiniz?')) return
                    await supabase.from('profiles').update({sms_unsubscribed:true,sms_unsubscribed_at:new Date().toISOString(),sms_consent:false}).eq('id',user.id)
                    setProfile(p=>({...p,sms_unsubscribed:true,sms_consent:false}))
                    toast3('SMS bildirimlerinden çıkış yapıldı')
                  }} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold">
                    ✗ Listeden Çık
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs leading-relaxed" style={{color:labelMuted}}>
                    Randevu hatırlatma ve kampanya SMS'leri almak istiyor musunuz?
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" id="sms-consent" className="mt-0.5" style={{accentColor:accent}}/>
                    <span className="text-xs leading-relaxed" style={{color:labelMuted}}>
                      6698 sayılı KVKK kapsamında verilerimin işlenmesine ve tarafıma SMS gönderilmesine onay veriyorum.
                    </span>
                  </label>
                  <button onClick={async()=>{
                    const cb = document.getElementById('sms-consent')
                    if(!cb?.checked){ toast3('❌ Lütfen KVKK onayını işaretleyin'); return }
                    await supabase.from('profiles').update({sms_consent:true,sms_consent_at:new Date().toISOString(),sms_unsubscribed:false}).eq('id',user.id)
                    setProfile(p=>({...p,sms_consent:true,sms_unsubscribed:false}))
                    toast3('✅ SMS bildirimleri aktif')
                  }} className="w-full py-2 text-white rounded-lg text-xs font-bold" style={{background:accent}}>
                    Onaylıyorum
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {['tr','en'].map(l=>(
                <button key={l} onClick={()=>{ localStorage.setItem('lang',l); setUiLang?.(l) }}
                  className={'flex-1 py-2 rounded-xl text-sm font-bold border transition-colors '+
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
              <div className={'font-bold '+(isDark?'text-white':'')}>Profili Düzenle</div>
              <button onClick={()=>setEditProfile(false)} className={'w-7 h-7 flex items-center justify-center rounded-lg '+(isDark?'hover:bg-white/10 text-white/40':'hover:bg-gray-100 text-gray-400')}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className={'text-xs font-bold block mb-1 '+(isDark?'text-white/60':'')}>Ad Soyad *</label>
                <input value={profileForm.full_name} onChange={e=>setProfileForm(p=>({...p,full_name:e.target.value}))}
                  className={'w-full px-3 py-2.5 rounded-xl text-sm outline-none '+(isDark?'bg-white/5 border border-white/10 text-white':'border border-gray-200 focus:border-orange-400')} />
              </div>
              <div>
                <label className={'text-xs font-bold block mb-1 '+(isDark?'text-white/60':'')}>Telefon</label>
                <input value={profileForm.phone} onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))}
                  placeholder="+90 555 000 00 00"
                  className={'w-full px-3 py-2.5 rounded-xl text-sm outline-none '+(isDark?'bg-white/5 border border-white/10 text-white':'border border-gray-200 focus:border-orange-400')} />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setEditProfile(false)} className={'flex-1 py-2.5 rounded-xl text-sm font-semibold '+(isDark?'border border-white/10 text-white/70 hover:bg-white/5':'border border-gray-200 hover:bg-gray-50')}>İptal</button>
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                style={{background:accent}}>
                {savingProfile?'Kaydediliyor...':'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
