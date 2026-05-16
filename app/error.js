'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function RouteError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Bir şeyler ters gitti</h2>
        <p className="text-sm text-slate-500 mb-6">Sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsin.</p>
        {process.env.NODE_ENV !== 'production' && error?.message && (
          <pre className="text-left text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 overflow-auto max-h-32">{error.message}</pre>
        )}
        <div className="flex gap-2">
          <button onClick={() => reset()} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold">
            Tekrar Dene
          </button>
          <a href="/" className="flex-1 py-2.5 border border-gray-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 flex items-center justify-center">
            Ana Sayfa
          </a>
        </div>
      </div>
    </div>
  )
}
