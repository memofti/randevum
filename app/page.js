'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full filter blur-3xl" />

      <div className="relative z-10 text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-orange-500/40">
          📅
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">RandevuApp</h1>
        <p className="text-white/50 text-base">Hangi paneli görüntülemek istersiniz?</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
        <Link href="/customer" className="group bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-orange-500/40 rounded-2xl p-7 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
          <div className="text-4xl mb-4">👤</div>
          <div className="text-white font-bold text-lg mb-2">Müşteri</div>
          <div className="text-white/40 text-sm leading-relaxed">İşletme keşfet, randevu al, puanlarını yönet</div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-orange-500 text-sm font-semibold group-hover:gap-2.5 transition-all">
            Giriş Yap <span>→</span>
          </div>
        </Link>

        <Link href="/business" className="group bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-orange-500/40 rounded-2xl p-7 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
          <div className="text-4xl mb-4">🏢</div>
          <div className="text-white font-bold text-lg mb-2">Firma Paneli</div>
          <div className="text-white/40 text-sm leading-relaxed">Randevuları, personeli ve hizmetleri yönet</div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-orange-500 text-sm font-semibold group-hover:gap-2.5 transition-all">
            Panele Git <span>→</span>
          </div>
        </Link>

        <Link href="/admin" className="group bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-orange-500/40 rounded-2xl p-7 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-white font-bold text-lg mb-2">Admin Paneli</div>
          <div className="text-white/40 text-sm leading-relaxed">Tüm firmaları ve platformu yönet</div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-orange-500 text-sm font-semibold group-hover:gap-2.5 transition-all">
            Admin Giriş <span>→</span>
          </div>
        </Link>
      </div>

      <div className="relative z-10 mt-10 text-white/25 text-xs flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Supabase • Canlı Veri
      </div>
    </div>
  )
}
