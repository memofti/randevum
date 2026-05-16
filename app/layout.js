import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: {
    default: 'RandevuApp — Akıllı Randevu Platformu',
    template: '%s · RandevuApp',
  },
  description: 'Güzellik, sağlık, fitness ve daha fazla sektörde online randevu al, yorum yap, sadakat puanı kazan.',
  keywords: ['randevu', 'online randevu', 'kuaför randevu', 'güzellik salonu', 'masaj salonu', 'spa', 'fitness randevu'],
  manifest: '/manifest.json',
  metadataBase: new URL('https://randevum-lemon.vercel.app'),
  openGraph: {
    title: 'RandevuApp',
    description: 'Şehrinde en iyi mekânlardan online randevu al.',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'RandevuApp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RandevuApp',
    description: 'Şehrinde en iyi mekânlardan online randevu al.',
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RandevuApp',
  },
}

export const viewport = {
  themeColor: '#ff6b35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        <script dangerouslySetInnerHTML={{__html:`
    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>{
        navigator.serviceWorker.register('/sw.js').then(()=>console.log('SW registered')).catch(()=>{})
      })
    }
  `}} />
      </body>
    </html>
  )
}
