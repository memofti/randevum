'use client'
import { supabase } from '@/lib/supabase'
import { t as i18n } from '@/lib/i18n'

function distKm(lat1,lng1,lat2,lng2){const R=6371,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

const PALETTE = {
  default:  { stripe:'#fff', ink:'#0a0a0a', muted:'#6b7280', accent:'#f97316', border:'1px solid #e5e7eb', radius:'12px',  fallback:'linear-gradient(135deg,#f97316,#fb923c)' },
  minimal:  { stripe:'#fff', ink:'#111111', muted:'#8a8580', accent:'#b04a3a', border:'1px solid #e5e0d8', radius:'2px',   fallback:'linear-gradient(135deg,#b04a3a,#c9685a)' },
  luxury:   { stripe:'#0f0f0f', ink:'#fff', muted:'rgba(255,255,255,0.55)', accent:'#d4af37', border:'1px solid rgba(212,175,55,0.3)', radius:'8px', fallback:'linear-gradient(135deg,#d4af37,#f5e06e)' },
  soft:     { stripe:'rgba(255,255,255,0.65)', ink:'#3a2a4a', muted:'#7e6a8a', accent:'#e85d8a', border:'1px solid rgba(255,255,255,0.8)', radius:'18px', fallback:'linear-gradient(135deg,#ffb3d1,#c8b6ff)', glass:true },
  bold:     { stripe:'#fff', ink:'#0a0a12', muted:'#5a5d6a', accent:'#1736ff', border:'2px solid #0a0a12', radius:'0', fallback:'#1736ff' },
}

export default function AdBanner({ ads, userLoc, businesses, onBizDetail, variant='default', uiLang='tr' }) {
  if (!ads?.length) return null
  const T = (k, vars) => i18n(k, uiLang, vars)
  const P = PALETTE[variant] || PALETTE.default

  const visibleAds = ads.filter(ad => {
    if (ad.type === 'general') return true
    if (ad.type === 'regional' && userLoc && ad.target_lat && ad.target_lng) {
      return distKm(userLoc.lat, userLoc.lng, parseFloat(ad.target_lat), parseFloat(ad.target_lng)) <= (ad.target_radius_km || 20)
    }
    return false
  }).sort((a,b) => (b.discount_pct||0)-(a.discount_pct||0))

  if (!visibleAds.length) return null

  const handleClick = async (ad) => {
    const newClicks = (ad.clicks||0) + 1
    await supabase.from('ads').update({clicks: newClicks}).eq('id', ad.id)
    // En son onaylı reklam paketinin max_clicks'ine ulaşılınca reklamı durdur
    try {
      const { data: lastPurchase } = await supabase.from('ad_package_purchases')
        .select('id, ad_packages(max_clicks)')
        .eq('business_id', ad.business_id).eq('status','approved')
        .order('approved_at', { ascending: false }).limit(1).maybeSingle()
      const maxClicks = lastPurchase?.ad_packages?.max_clicks || 0
      if (maxClicks > 0 && newClicks >= maxClicks) {
        await supabase.from('ads').update({ status: 'paused' }).eq('id', ad.id)
      }
    } catch {}
    const biz = businesses.find(b => b.id === ad.business_id)
    if (biz) onBizDetail(biz, ad.discount_pct||0)
  }

  return (
    <section className="my-2">
      {/* Mini başlık şeridi */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black tracking-[0.3em]" style={{color:P.accent}}>★ {T('campaignsKicker')}</span>
        <span className="h-px flex-1" style={{background:P.ink+'20'}}/>
        <span className="text-[10px] font-black tracking-widest" style={{color:P.muted}}>{T('campaignsTitle')} · {String(visibleAds.length).padStart(2,'0')}</span>
      </div>

      {/* Şerit listesi */}
      <div className="space-y-2">
        {visibleAds.map((ad,i) => {
          const isCoupon = (ad.discount_amount||0) > 0 && !(ad.discount_pct>0)
          return (
            <article key={ad.id} onClick={()=>handleClick(ad)}
              className="group cursor-pointer relative overflow-hidden flex items-stretch transition-all hover:-translate-y-px"
              style={{
                background: P.stripe,
                border: P.border,
                borderRadius: P.radius,
                backdropFilter: P.glass ? 'blur(18px) saturate(180%)' : undefined,
                WebkitBackdropFilter: P.glass ? 'blur(18px) saturate(180%)' : undefined,
                height: '76px',
                boxShadow: variant==='bold' ? '4px 4px 0 0 '+P.ink : variant==='luxury' ? '0 8px 24px -12px '+P.accent+'30' : undefined,
              }}>
              {/* Görsel — kare, soldan */}
              <div className="flex-shrink-0 relative overflow-hidden"
                style={{
                  width: '76px',
                  background: ad.image_url ? '#000' : P.fallback,
                  borderRight: variant==='bold' ? '2px solid '+P.ink : '1px solid '+P.ink+'10',
                }}>
                {ad.image_url
                  ? <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                  : <div className="w-full h-full flex items-center justify-center text-3xl">{ad.businesses?.emoji||'★'}</div>
                }
              </div>

              {/* İçerik — orta */}
              <div className="flex-1 min-w-0 px-3 sm:px-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                  <span className="hidden sm:inline text-[10px] font-black tracking-[0.2em] flex-shrink-0" style={{color:P.accent}}>
                    {T('offer')} N°{String(i+1).padStart(2,'0')}
                  </span>
                  {ad.type==='regional' && (
                    <span className="text-[10px] font-bold flex-shrink-0" style={{color:P.muted}}>📍 {T('nearby')}</span>
                  )}
                  <span className="text-[10px] font-bold truncate min-w-0" style={{color:P.muted}}>{ad.businesses?.name}</span>
                </div>
                <div className="font-black text-sm sm:text-base truncate" style={{color:P.ink,letterSpacing:'-0.01em'}}>
                  {ad.title}
                </div>
                {ad.description && (
                  <div className="text-xs truncate hidden sm:block mt-0.5" style={{color:P.muted}}>{ad.description}</div>
                )}
              </div>

              {/* İndirim/Kupon rozeti + CTA — sağ */}
              <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 flex-shrink-0"
                style={{borderLeft: variant==='bold' ? '2px solid '+P.ink : '1px solid '+P.ink+'10'}}>
                {/* İndirim numarası (yüzde) veya kupon rozeti */}
                {ad.discount_pct > 0 ? (
                  <div className="text-right">
                    <div className="font-black leading-none" style={{
                      fontSize:'clamp(1.125rem,4vw,2rem)',
                      color: P.accent,
                      letterSpacing:'-0.04em',
                      fontStyle: variant==='bold'?'italic':'normal',
                    }}>
                      %{ad.discount_pct}
                    </div>
                    <div className="text-[9px] font-black tracking-[0.2em] hidden sm:block" style={{color:P.muted}}>{T('discount')}</div>
                  </div>
                ) : isCoupon ? (
                  <div className="text-right">
                    <div className="font-black leading-none" style={{
                      fontSize:'clamp(1rem,3.5vw,1.75rem)',
                      color: P.accent,
                      letterSpacing:'-0.03em',
                    }}>
                      ₺{Math.round(ad.discount_amount)}
                    </div>
                    <div className="text-[9px] font-black tracking-[0.2em] flex items-center gap-1 justify-end hidden sm:flex" style={{color:P.muted}}>
                      🎟️ KUPON
                    </div>
                  </div>
                ) : null}

                {/* CTA arrow */}
                <div className="hidden sm:flex items-center justify-center w-9 h-9 transition-all group-hover:translate-x-0.5"
                  style={{
                    background: P.accent,
                    color: variant==='luxury' ? '#000' : '#fff',
                    borderRadius: variant==='bold' || variant==='minimal' ? '0' : '999px',
                    boxShadow: variant==='luxury' ? '0 0 16px '+P.accent+'66' : undefined,
                  }}>
                  <span className="text-base font-black">→</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
