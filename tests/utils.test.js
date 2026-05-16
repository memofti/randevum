import { describe, it, expect } from 'vitest'

// Aynı haversine fonksiyonunun referansı — temalar arasındaki dist hesabını koru
function distKm(a, b, c, d) {
  const R = 6371
  const dL = (c - a) * Math.PI / 180
  const dN = (d - b) * Math.PI / 180
  const e = Math.sin(dL/2)**2 + Math.cos(a*Math.PI/180) * Math.cos(c*Math.PI/180) * Math.sin(dN/2)**2
  return R * 2 * Math.atan2(Math.sqrt(e), Math.sqrt(1-e))
}

describe('distKm (haversine)', () => {
  it('aynı nokta için 0 döner', () => {
    expect(distKm(41.0082, 28.9784, 41.0082, 28.9784)).toBeCloseTo(0, 5)
  })
  it('İstanbul → Ankara ~350km', () => {
    const d = distKm(41.0082, 28.9784, 39.9334, 32.8597)
    expect(d).toBeGreaterThan(340)
    expect(d).toBeLessThan(360)
  })
  it('1 derece enlem ~111km', () => {
    const d = distKm(40, 30, 41, 30)
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})
