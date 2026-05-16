import './globals.css'

export const metadata = {
  title: 'RandevuApp',
  description: 'Randevu yönetim platformu',
  manifest: '/manifest.json',
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
      <body>{children}<script dangerouslySetInnerHTML={{__html:`
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
