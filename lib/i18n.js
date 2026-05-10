// Basit i18n sistemi
export const translations = {
  tr: {
    discover: 'Keşfet',
    map: 'Harita',
    appointments: 'Randevularım',
    profile: 'Profilim',
    bookAppt: 'Randevu Al',
    cancel: 'İptal Et',
    save: 'Kaydet',
    loading: 'Yükleniyor...',
    nearby: 'Yakınındaki İşletmeler',
    campaigns: 'Size Özel Kampanyalar',
    services: 'Hizmetler',
    staff: 'Personel',
    gallery: 'Galeri',
    reviews: 'Yorumlar',
    logout: 'Çıkış Yap',
    loyaltyPoints: 'Sadakat Puanı',
    notifications: 'Bildirimleri Aç',
  },
  en: {
    discover: 'Discover',
    map: 'Map',
    appointments: 'My Appointments',
    profile: 'My Profile',
    bookAppt: 'Book Appointment',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    nearby: 'Nearby Businesses',
    campaigns: 'Special Campaigns',
    services: 'Services',
    staff: 'Staff',
    gallery: 'Gallery',
    reviews: 'Reviews',
    logout: 'Logout',
    loyaltyPoints: 'Loyalty Points',
    notifications: 'Enable Notifications',
  }
}

export function t(key, lang = 'tr') {
  return translations[lang]?.[key] || translations.tr[key] || key
}

export function getLang() {
  if (typeof window === 'undefined') return 'tr'
  return localStorage.getItem('lang') || 'tr'
}

export function setLang(lang) {
  if (typeof window !== 'undefined') localStorage.setItem('lang', lang)
}
