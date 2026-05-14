'use client'

export default function QRModal({ qrModal, setQrModal }) {
  if (!qrModal) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const qrUrl = origin + '/qr/' + (qrModal.qr_token || qrModal.id)
  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setQrModal(null)}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
        <div className="font-bold mb-1 text-gray-900">{qrModal.businesses?.name}</div>
        <div className="text-xs text-gray-500 mb-4">
          {new Date(qrModal.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} · {String(qrModal.appointment_time).slice(0,5)}
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 inline-block">
          <img src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(qrUrl)} alt="QR" className="w-48 h-48 mx-auto"/>
        </div>
        <p className="text-xs text-gray-400 mb-4">Firmaya gelince bu QR kodu okutun</p>
        <button onClick={()=>setQrModal(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Kapat</button>
      </div>
    </div>
  )
}
