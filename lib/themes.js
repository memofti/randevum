// lib/themes.js
export const THEMES = {
  orange: {
    name: 'Turuncu',
    emoji: '🟠',
    primary: '#f97316',
    primaryDark: '#ea580c',
    primaryLight: '#fed7aa',
    primaryBg: '#fff7ed',
    navBg: '#1e293b',
    navBg2: '#334155',
    heroFrom: '#1e293b',
    heroTo: '#334155',
    accent: '#ff6b35',
  },
  purple: {
    name: 'Mor',
    emoji: '🟣',
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    primaryLight: '#ddd6fe',
    primaryBg: '#f5f3ff',
    navBg: '#1e1b4b',
    navBg2: '#312e81',
    heroFrom: '#1e1b4b',
    heroTo: '#312e81',
    accent: '#a78bfa',
  },
  green: {
    name: 'Yeşil',
    emoji: '🟢',
    primary: '#10b981',
    primaryDark: '#059669',
    primaryLight: '#a7f3d0',
    primaryBg: '#ecfdf5',
    navBg: '#064e3b',
    navBg2: '#065f46',
    heroFrom: '#064e3b',
    heroTo: '#065f46',
    accent: '#34d399',
  },
  blue: {
    name: 'Mavi',
    emoji: '🔵',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#bfdbfe',
    primaryBg: '#eff6ff',
    navBg: '#1e3a5f',
    navBg2: '#1d4ed8',
    heroFrom: '#1e3a5f',
    heroTo: '#1d4ed8',
    accent: '#60a5fa',
  },
}

export function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.orange
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-dark', theme.primaryDark)
  root.style.setProperty('--color-primary-light', theme.primaryLight)
  root.style.setProperty('--color-primary-bg', theme.primaryBg)
  root.style.setProperty('--color-nav-bg', theme.navBg)
  root.style.setProperty('--color-nav-bg2', theme.navBg2)
  root.style.setProperty('--color-hero-from', theme.heroFrom)
  root.style.setProperty('--color-hero-to', theme.heroTo)
  return theme
}
