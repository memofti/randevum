import './globals.css'

export const metadata = {
  title: 'RandevuApp',
  description: 'Randevu yönetim platformu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
