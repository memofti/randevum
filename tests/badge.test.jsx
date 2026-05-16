import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// customer/page.js'deki Bdg badge'in test edilebilir kopyası
function Bdg({ s, pastDue }) {
  if (pastDue && (s === 'confirmed' || s === 'pending')) {
    return <span data-testid="bdg">⏳ Tamamlandı bekleniyor</span>
  }
  const m = {
    confirmed: '✓ Onaylı',
    pending: '⏳ Bekliyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  }
  return <span data-testid="bdg">{m[s] || m.completed}</span>
}

describe('Bdg badge', () => {
  it('confirmed → "✓ Onaylı"', () => {
    render(<Bdg s="confirmed" />)
    expect(screen.getByTestId('bdg')).toHaveTextContent('Onaylı')
  })
  it('completed → "Tamamlandı"', () => {
    render(<Bdg s="completed" />)
    expect(screen.getByTestId('bdg')).toHaveTextContent('Tamamlandı')
  })
  it('pastDue + confirmed → "Tamamlandı bekleniyor"', () => {
    render(<Bdg s="confirmed" pastDue />)
    expect(screen.getByTestId('bdg')).toHaveTextContent('bekleniyor')
  })
  it('cancelled pastDue olsa bile değişmez', () => {
    render(<Bdg s="cancelled" pastDue />)
    expect(screen.getByTestId('bdg')).toHaveTextContent('İptal')
  })
})
