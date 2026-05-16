'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="tr">
      <body style={{margin:0,fontFamily:'-apple-system,Inter,system-ui,sans-serif',background:'#f8fafc',color:'#0f172a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{maxWidth:'28rem',width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'1rem',padding:'2rem',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'1rem'}}>💥</div>
          <h2 style={{fontSize:'1.25rem',fontWeight:700,marginBottom:'0.5rem'}}>Beklenmedik bir hata oluştu</h2>
          <p style={{fontSize:'0.875rem',color:'#64748b',marginBottom:'1.5rem'}}>Uygulamada kritik bir sorun oluştu. Sayfayı yenileyerek tekrar dene.</p>
          <button onClick={() => reset()} style={{padding:'0.75rem 1.5rem',background:'#f97316',color:'#fff',border:'none',borderRadius:'0.75rem',fontWeight:700,cursor:'pointer'}}>
            Yeniden Yükle
          </button>
        </div>
      </body>
    </html>
  )
}
