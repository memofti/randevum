'use client'
import { useState } from 'react'
import { t as i18n } from '@/lib/i18n'

const STAFF_COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

// Aynı palet BookingModal ile uyumlu
const VARIANTS = {
  default: { bg:'#fff', ink:'#0a0a0a', muted:'#6b7280', accent:'#f97316', sec:'#1e293b', border:'#e5e7eb', chip:'#f3f4f6', heroFallback:'linear-gradient(135deg,#ffedd5,#fed7aa)', radius:'1.25rem' },
  minimal: { bg:'#fbfaf6', ink:'#111111', muted:'#8a8580', accent:'#b04a3a', sec:'#5d6d3e', border:'#e5e0d8', chip:'#f0ece5', heroFallback:'#e7e2d8', radius:'2px' },
  luxury:  { bg:'#0f0f0f', ink:'#fff', muted:'rgba(255,255,255,0.55)', accent:'#d4af37', sec:'#f5e06e', border:'#222', chip:'#1a1a1a', heroFallback:'linear-gradient(135deg,#1a1a1a,#0f0f0f)', radius:'0.5rem' },
  soft:    { bg:'#fff', ink:'#3a2a4a', muted:'#7e6a8a', accent:'#e85d8a', sec:'#9b5cb8', border:'#f5e0ea', chip:'#fff0f6', heroFallback:'linear-gradient(135deg,#ffb3d1,#c8b6ff)', radius:'1.5rem' },
  bold:    { bg:'#fff', ink:'#0a0a12', muted:'#5a5d6a', accent:'#1736ff', sec:'#0a0a12', border:'#0a0a12', chip:'#f5f5f7', heroFallback:'#1736ff', radius:'0' },
}

function Spin({color}) { return <div className="w-5 h-5 border-2 rounded-full animate-spin flex-shrink-0" style={{borderColor:'rgba(150,150,150,0.25)',borderTopColor:color}}/> }

export default function BusinessDetailModal({ biz, bizIdx, services, staff, reviews=[], canReview=false, onReview, loading, onClose, onBook, variant='default', uiLang='tr' }) {
  const [lightboxUrl, setLightboxUrl] = useState(null)
  if (!biz) return null
  const T = (k, vars) => i18n(k, uiLang, vars)
  const V = VARIANTS[variant] || VARIANTS.default
  const isDark = variant === 'luxury'
  const isBrutalist = variant === 'bold' || variant === 'minimal'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{background:'rgba(0,0,0,0.55)'}}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="relative w-full sm:max-w-2xl">
        {/* Kapat — scroll dışında, her zaman görünür */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-all hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.95)',
            color: '#0a0a0a',
            borderRadius: isBrutalist ? '0' : '9999px',
            backdropFilter:'blur(8px)',
            boxShadow:'0 4px 12px rgba(0,0,0,0.35)',
          }}>
          <span aria-hidden="true">✕</span> {T('close')}
        </button>

      <div className="w-full max-h-[85vh] sm:max-h-[88vh] overflow-y-auto shadow-2xl"
        style={{
          background: V.bg,
          color: V.ink,
          borderRadius: isBrutalist ? V.radius : `${V.radius} ${V.radius} 0 0`,
          border: isDark ? '1px solid '+V.border : variant==='bold' ? '2px solid '+V.border : 'none',
        }}>
        {/* COVER */}
        <div className="relative h-36 sm:h-52 overflow-hidden flex-shrink-0"
          style={{
            background: biz.cover_url ? '#000' : V.heroFallback,
            borderBottom: variant==='bold' ? '2px solid '+V.border : isDark ? '1px solid '+V.border : 'none',
          }}>
          {biz.cover_url
            ? <img src={biz.cover_url} alt={biz.name} className="w-full h-full object-cover"/>
            : <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-80">{biz.emoji||'🏢'}</div>
          }
          <div className="absolute inset-0" style={{background: biz.cover_url ? 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)' : 'none'}}/>

          {/* Müsait rozeti */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs font-bold px-2.5 py-1"
              style={{
                background: '#22c55e',
                color: '#fff',
                borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
              }}>
              {T('available')}
            </span>
          </div>

          {/* Alt bilgi şeridi — başlık + puan */}
          <div className="absolute left-0 right-0 bottom-0 p-5 z-10 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black tracking-[0.25em] mb-1" style={{color:'rgba(255,255,255,0.85)',textShadow:'0 1px 6px rgba(0,0,0,0.4)'}}>
                {(biz.category||'').toUpperCase()} · {(biz.city||'').toUpperCase()}
              </div>
              <h2 className="font-black tracking-tight truncate"
                style={{
                  fontSize:'clamp(1.5rem,4vw,2.25rem)',
                  color: '#fff',
                  letterSpacing:'-0.03em',
                  lineHeight:1.05,
                  textShadow:'0 2px 12px rgba(0,0,0,0.5)',
                  fontStyle: variant==='bold'?'normal':'normal',
                }}>
                {biz.name}
              </h2>
            </div>
            <div className="text-right flex-shrink-0 px-2.5 py-1.5"
              style={{
                background:'rgba(0,0,0,0.55)',
                color:'#fff',
                borderRadius: variant==='bold'||variant==='minimal' ? '0' : '0.75rem',
                backdropFilter:'blur(8px)',
              }}>
              <div className="font-black text-base flex items-center gap-1" style={{color:V.accent}}>{(biz.rating||0).toFixed(1)} <span className="text-xs">★</span></div>
              <div className="text-[10px]" style={{color:'rgba(255,255,255,0.7)'}}>{T('reviewsCount',{x:biz.review_count||0})}</div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Bio */}
          {(biz.bio || biz.description) && (
            <div className="text-sm leading-relaxed" style={{color:V.muted}}>
              {biz.bio || biz.description}
            </div>
          )}

          {/* Sosyal & iletişim — chip'ler */}
          {(biz.phone || biz.address || biz.instagram || biz.facebook || biz.website) && (
            <div className="flex gap-2 flex-wrap">
              {biz.phone && (
                <a href={'tel:'+biz.phone}
                  className="text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{
                    background:V.accent, color: isDark?'#000':'#fff',
                    borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                  }}>
                  📞 {biz.phone}
                </a>
              )}
              {biz.address && (
                <span className="text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                  style={{
                    background:V.chip, color:V.muted,
                    borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                  }}>
                  📍 {biz.address}
                </span>
              )}
              {biz.instagram && (
                <a href={biz.instagram} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5 transition-colors"
                  style={{
                    border:'1px solid '+(isDark?'rgba(236,72,153,0.4)':'#fbcfe8'),
                    color:isDark?'#f0abfc':'#db2777',
                    borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                  }}>
                  📸 Instagram
                </a>
              )}
              {biz.facebook && (
                <a href={biz.facebook} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
                  style={{
                    border:'1px solid '+(isDark?'rgba(59,130,246,0.4)':'#bfdbfe'),
                    color:isDark?'#93c5fd':'#2563eb',
                    borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                  }}>
                  👍 Facebook
                </a>
              )}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
                  style={{
                    border:'1px solid '+V.border, color:V.muted,
                    borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                  }}>
                  🌐 {T('websiteLink')}
                </a>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2" style={{color:V.muted}}>
              <Spin color={V.accent}/> {T('loading')}
            </div>
          ) : (
            <>
              {/* Galeri */}
              {(biz.gallery_urls||[]).length > 0 && (
                <div>
                  <div className="text-[11px] font-black tracking-[0.25em] mb-3" style={{color:V.accent}}>📸 {T('galleryLabel').toUpperCase()}</div>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {(biz.gallery_urls||[]).map((url,i) => (
                      <img key={i} src={url} alt="" className="flex-none w-28 h-28 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          borderRadius: variant==='bold'||variant==='minimal' ? '0' : '0.75rem',
                          border: '1px solid '+V.border,
                        }}
                        onClick={() => setLightboxUrl(url)}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Hizmetler */}
              <div>
                <div className="text-[11px] font-black tracking-[0.25em] mb-3" style={{color:V.accent}}>{T('servicesLabel').toUpperCase()}</div>
                {services.length === 0 ? (
                  <div className="text-sm" style={{color:V.muted}}>{T('noServiceInfo')}</div>
                ) : (
                  <div className="space-y-2">
                    {services.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3"
                        style={{
                          background:V.chip,
                          border:'1px solid '+V.border,
                          borderRadius: variant==='bold'||variant==='minimal' ? '0' : '0.75rem',
                        }}>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate" style={{color:V.ink}}>{s.name}</div>
                          <div className="text-xs" style={{color:V.muted}}>{s.duration_min} dk</div>
                        </div>
                        <div className="font-black text-base ml-3 flex-shrink-0" style={{color:V.accent,letterSpacing:'-0.02em'}}>₺{s.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personel */}
              {staff.length > 0 && (
                <div>
                  <div className="text-[11px] font-black tracking-[0.25em] mb-3" style={{color:V.accent}}>{T('staffLabel').toUpperCase()}</div>
                  <div className="flex gap-2 flex-wrap">
                    {staff.map((s,i) => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2"
                        style={{
                          background:V.chip,
                          border:'1px solid '+V.border,
                          borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{background:STAFF_COLORS[i%STAFF_COLORS.length]}}>{s.name[0]}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{color:V.ink}}>{s.name.split(' ')[0]}</div>
                          <div className="text-[10px] font-bold" style={{color:V.accent}}>★ {s.rating}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yorumlar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-black tracking-[0.25em]" style={{color:V.accent}}>⭐ YORUMLAR ({biz.review_count||0})</div>
                  {canReview && (
                    <button onClick={onReview}
                      className="text-[11px] font-bold px-3 py-1.5 transition-opacity hover:opacity-80"
                      style={{
                        background:V.accent, color: isDark?'#000':'#fff',
                        borderRadius: variant==='bold'||variant==='minimal' ? '0' : '9999px',
                      }}>
                      ✍️ Yorum Yaz
                    </button>
                  )}
                </div>
                {reviews.length === 0 ? (
                  <div className="text-sm" style={{color:V.muted}}>
                    Henüz yorum yok.{!canReview && ' Yorum yapabilmek için bu firmada tamamlanmış bir randevunuz olmalı.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviews.slice(0,5).map(r => (
                      <div key={r.id} className="p-3"
                        style={{
                          background:V.chip,
                          border:'1px solid '+V.border,
                          borderRadius: variant==='bold'||variant==='minimal' ? '0' : '0.75rem',
                        }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold" style={{color:V.ink}}>{r.profiles?.full_name || 'Müşteri'}</div>
                          <div className="text-xs font-bold" style={{color:V.accent}}>{'★'.repeat(r.rating||0)}<span style={{color:V.muted}}>{'★'.repeat(Math.max(0,5-(r.rating||0)))}</span></div>
                        </div>
                        {r.comment && <div className="text-xs leading-relaxed" style={{color:V.muted}}>{r.comment}</div>}
                      </div>
                    ))}
                    {reviews.length > 5 && (
                      <a href={'/firma/'+biz.id} target="_blank" rel="noopener noreferrer"
                        className="block text-center text-xs font-bold py-2 transition-opacity hover:opacity-80"
                        style={{color:V.accent}}>
                        Tüm yorumları gör →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* CTA */}
          <button onClick={onBook}
            className="w-full py-4 font-black text-base transition-opacity hover:opacity-90"
            style={{
              background: V.accent,
              color: isDark ? '#000' : '#fff',
              borderRadius: variant==='bold'||variant==='minimal' ? '0' : '0.875rem',
              boxShadow: variant==='luxury' ? '0 0 24px '+V.accent+'66' : variant==='bold' ? '4px 4px 0 0 '+V.ink : '0 8px 20px -8px '+V.accent+'66',
              letterSpacing: variant==='luxury' || variant==='bold' ? '0.15em' : 'normal',
            }}>
            📅 {T('bookAppt')}
          </button>
        </div>
      </div>
      </div>

      {/* Galeri lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}>
          <button onClick={(e)=>{e.stopPropagation();setLightboxUrl(null)}}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-xl bg-white/10 hover:bg-white/20 rounded-full">✕</button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain"
            onClick={(e)=>e.stopPropagation()}/>
        </div>
      )}
    </div>
  )
}
