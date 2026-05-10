'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })

function Spin() { return <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" /> }

export default function FirmaPage() {
  const params = useParams()
  const router = useRouter()
  const bizId = params.id

  const [biz, setBiz] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [showMap, setShowMap] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (!bizId) return
    Promise.all([
      supabase.from('businesses').select('*').eq('id', bizId).maybeSingle(),
      supabase.from('services').select('*').eq('business_id', bizId).eq('status', 'active'),
      supabase.from('staff').select('*').eq('business_id', bizId),
      supabase.from('reviews').select('*, profiles(full_name)').eq('business_id', bizId).order('created_at', {ascending: false}).limit(10),
    ]).then(([{data:b},{data:s},{data:st},{data:r}]) => {
      setBiz(b)
      setServices(s||[])
      setStaff(st||[])
      setReviews(r||[])
      setLoading(false)
    })
  }, [bizId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spin />
    </div>
  )

  if (!biz) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-bold text-gray-600">İşletme bulunamadı</div>
        <button onClick={() => router.back()} className="mt-4 text-orange-500 text-sm">← Geri dön</button>
      </div>
    </div>
  )

  const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 h-14 flex items-center px-4 gap-3">
        <button onClick={() => router.back()} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
          ← Geri
        </button>
        <div className="flex-1 text-white font-bold text-sm truncate">{biz.name}</div>
        <button onClick={() => user ? router.push('/customer') : router.push('/login')}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          Randevu Al
        </button>
      </div>

      {/* Kapak */}
      <div className="relative h-56 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center overflow-hidden">
        {biz.cover_url
          ? <img src={biz.cover_url} alt={biz.name} className="w-full h-full object-cover"/>
          : <span className="text-8xl">{biz.emoji||'🏢'}</span>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
        <div className="absolute bottom-4 left-4 text-white">
          <div className="text-2xl font-extrabold">{biz.name}</div>
          <div className="text-white/70 text-sm mt-0.5">{biz.category} · {biz.city}</div>
        </div>
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-sm font-bold px-3 py-1 rounded-full">
          ★ {biz.rating} ({biz.review_count})
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Hızlı Butonlar */}
        <div className="flex gap-3 mb-5">
          {biz.phone && <a href={"tel:"+biz.phone} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50">📞 Ara</a>}
          {(biz.lat && biz.lng) && <button onClick={() => setShowMap(!showMap)} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50">🗺️ Haritada Gör</button>}
          <button onClick={() => user ? router.push('/customer') : router.push('/login')}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-bold">📅 Randevu Al</button>
        </div>

        {/* Sosyal medya */}
        {(biz.instagram||biz.facebook||biz.website) && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {biz.instagram && <a href={biz.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 bg-pink-50">📸 Instagram</a>}
            {biz.facebook && <a href={biz.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 bg-blue-50">👍 Facebook</a>}
            {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">🌐 Website</a>}
          </div>
        )}

        {/* Tab */}
        <div className="flex border-b border-gray-200 mb-5">
          {[['info','ℹ️ Hakkında'],['services','✨ Hizmetler'],['gallery','📸 Galeri'],['reviews','⭐ Yorumlar']].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)}
              className={"flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors "+(activeTab===k?'text-orange-500 border-orange-500':'text-gray-400 border-transparent hover:text-gray-600')}>
              {l}
            </button>
          ))}
        </div>

        {/* Hakkında */}
        {activeTab==='info' && (
          <div className="space-y-4">
            {biz.bio && <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><p className="text-sm text-gray-600 leading-relaxed">{biz.bio}</p></div>}
            {biz.description && <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><p className="text-sm text-gray-500 leading-relaxed">{biz.description}</p></div>}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
              {biz.address && <div className="flex items-start gap-3 text-sm"><span className="text-lg">📍</span><span className="text-gray-600">{biz.address}, {biz.city}</span></div>}
              {biz.phone && <div className="flex items-center gap-3 text-sm"><span className="text-lg">📞</span><a href={"tel:"+biz.phone} className="text-orange-500 font-semibold">{biz.phone}</a></div>}
              {biz.email && <div className="flex items-center gap-3 text-sm"><span className="text-lg">📧</span><span className="text-gray-600">{biz.email}</span></div>}
              {biz.price_from > 0 && <div className="flex items-center gap-3 text-sm"><span className="text-lg">💰</span><span className="text-gray-600"><b className="text-gray-800">₺{biz.price_from}</b>'den başlayan fiyatlar</span></div>}
            </div>
            {/* Personel */}
            {staff.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="font-bold text-sm mb-3">👥 Ekibimiz</div>
                <div className="flex gap-3 flex-wrap">
                  {staff.map((s,i)=>(
                    <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{background:COLORS[i%5]}}>{s.name[0]}</div>
                      <div><div className="text-xs font-semibold">{s.name}</div><div className="text-xs text-amber-500">★ {s.rating}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hizmetler */}
        {activeTab==='services' && (
          <div className="space-y-2">
            {services.length === 0
              ? <div className="text-center py-10 text-gray-400">Hizmet bilgisi yok</div>
              : services.map(s=>(
                <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-gray-400 mt-0.5">{s.duration_min} dk</div></div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-orange-500">₺{s.price}</div>
                    <button onClick={() => user ? router.push('/customer') : router.push('/login')}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Seç</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Galeri */}
        {activeTab==='gallery' && (
          <div>
            {(biz.gallery_urls||[]).length === 0
              ? <div className="text-center py-10 text-gray-400">Galeri boş</div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(biz.gallery_urls||[]).map((url,i)=>(
                    <img key={i} src={url} alt="" className="w-full h-36 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                      onClick={()=>window.open(url,'_blank')}/>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Yorumlar */}
        {activeTab==='reviews' && (
          <div className="space-y-3">
            {reviews.length === 0
              ? <div className="text-center py-10 text-gray-400">Henüz yorum yok</div>
              : reviews.map(r=>(
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{r.profiles?.full_name||'Müşteri'}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s=><span key={s} className={"text-sm "+(s<=r.rating?'text-amber-400':'text-gray-200')}>★</span>)}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                  <div className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
