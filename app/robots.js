export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/business', '/staff', '/customer', '/login', '/api'] },
    ],
    sitemap: 'https://randevum-lemon.vercel.app/sitemap.xml',
  }
}
