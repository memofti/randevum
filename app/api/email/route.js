import { NextResponse } from 'next/server'

function buildEmailHtml(content) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Segoe UI',Inter,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px;border-radius:16px 16px 0 0;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">📅</div>
      <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px;">RandevuApp</div>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
      ${content}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        RandevuApp · Randevu yönetim platformu<br>
        <a href="https://randevum-lemon.vercel.app" style="color:#f97316;text-decoration:none;">randevum-lemon.vercel.app</a>
      </div>
    </div>
  </div>
</body></html>`
}

function appointmentCard(rows) {
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
    <table style="width:100%;border-collapse:collapse;">
      ${rows.map(([l, v], i) => `
        <tr ${i > 0 ? 'style="border-top:1px solid #f1f5f9;"' : ''}>
          <td style="padding:8px 0;color:#64748b;font-size:14px;">${l}</td>
          <td style="padding:8px 0;font-weight:600;font-size:14px;text-align:right;">${v}</td>
        </tr>`).join('')}
    </table>
  </div>`
}

function getTemplate(type, data) {
  const templates = {
    new_booking: {
      subject: `📅 Randevu Talebiniz Alındı — ${data.businessName}`,
      content: `
        <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 6px;">Randevu Talebiniz Alındı</h2>
        <p style="color:#64748b;margin:0 0 4px;">Merhaba <b>${data.customerName || 'Değerli Müşteri'}</b>,</p>
        <p style="color:#64748b;margin:0 0 16px;"><b>${data.businessName}</b> firmasına randevu talebiniz iletildi. Onay bekleniyor.</p>
        ${appointmentCard([
          ['İşletme', data.businessName],
          ['Hizmet', data.serviceName],
          ['Tarih', data.date],
          ['Saat', data.time],
          ['Tutar', `<span style="color:#f97316;font-weight:700;">₺${data.price}</span>`],
        ])}
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-top:16px;">
          <p style="margin:0;color:#92400e;font-size:13px;">⏳ Firma onayladığında bildirim alacaksınız.</p>
        </div>`,
    },
    booking_confirmed: {
      subject: `✅ Randevunuz Onaylandı! — ${data.businessName}`,
      content: `
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:52px;height:52px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">✅</div>
        </div>
        <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 6px;text-align:center;">Randevunuz Onaylandı!</h2>
        <p style="color:#64748b;margin:0 0 16px;text-align:center;"><b>${data.businessName}</b> randevunuzu onayladı.</p>
        ${appointmentCard([
          ['İşletme', data.businessName],
          ['Hizmet', data.serviceName],
          ['Tarih', data.date],
          ['Saat', `<span style="color:#f97316;font-weight:700;font-size:16px;">${data.time}</span>`],
        ])}
        <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-top:16px;">
          <p style="margin:0;color:#166534;font-size:13px;">⏰ Randevunuzdan önce zamanında hazır olun. İptal için uygulamayı kullanabilirsiniz.</p>
        </div>`,
    },
    booking_cancelled: {
      subject: `❌ Randevu İptal Edildi — ${data.businessName}`,
      content: `
        <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 6px;">Randevu İptal Edildi</h2>
        <p style="color:#64748b;margin:0 0 16px;"><b>${data.businessName}</b> için ${data.date} - ${data.time} randevunuz iptal edildi.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;">
          <p style="margin:0;color:#991b1b;font-size:13px;">📅 Yeni randevu almak için uygulamayı ziyaret edin.</p>
        </div>
        <div style="margin-top:20px;text-align:center;">
          <a href="https://randevum-lemon.vercel.app/customer" style="display:inline-block;background:#f97316;color:white;padding:11px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Yeni Randevu Al →</a>
        </div>`,
    },
    new_appointment_business: {
      subject: `🔔 Yeni Randevu Talebi — ${data.customerName}`,
      content: `
        <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 6px;">Yeni Randevu Talebi</h2>
        <p style="color:#64748b;margin:0 0 16px;">Yeni bir randevu talebi geldi. Lütfen onaylayın.</p>
        ${appointmentCard([
          ['Müşteri', `<b>${data.customerName}</b>`],
          ['Hizmet', data.serviceName],
          ['Tarih', data.date],
          ['Saat', data.time],
          ['Tutar', `<span style="color:#f97316;font-weight:700;">₺${data.price}</span>`],
        ])}
        <div style="margin-top:20px;text-align:center;">
          <a href="https://randevum-lemon.vercel.app/business" style="display:inline-block;background:#f97316;color:white;padding:11px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Randevuyu Onayla →</a>
        </div>`,
    },
  }
  return templates[type] || null
}

export async function POST(req) {
  try {
    const { type, to, data } = await req.json()
    if (!to || !type) return NextResponse.json({ error: 'type ve to gerekli' }, { status: 400 })

    const template = getTemplate(type, data)
    if (!template) return NextResponse.json({ error: 'Bilinmeyen şablon: ' + type }, { status: 400 })

    const RESEND_API_KEY = process.env.RESEND_API_KEY

    // API key yoksa mock mod — app çalışmaya devam eder
    if (!RESEND_API_KEY) {
      console.log(`[Email MOCK] ${type} → ${to}`, data)
      return NextResponse.json({ success: true, mock: true })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RandevuApp <bildirim@randevuapp.com>',
        to: [to],
        subject: template.subject,
        html: buildEmailHtml(template.content),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend hatası:', err)
      return NextResponse.json({ error: err }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Email route hatası:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
