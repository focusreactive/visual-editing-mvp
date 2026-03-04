import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { SectionContext, useSectionContext } from '@/providers/SectionContext'

function Consumer() {
  const ctx = useSectionContext()
  return <span data-testid="val">{ctx?.basePath ?? 'none'}</span>
}

describe('SectionContext', () => {
  it('returns null outside provider', () => {
    render(<Consumer />)
    expect(screen.getByTestId('val').textContent).toBe('none')
  })

  it('provides basePath to consumers', () => {
    render(
      <SectionContext.Provider value={{ basePath: 'layout.2' }}>
        <Consumer />
      </SectionContext.Provider>,
    )
    expect(screen.getByTestId('val').textContent).toBe('layout.2')
  })

  it('provides empty basePath to consumers', () => {
    render(
      <SectionContext.Provider value={{ basePath: '' }}>
        <Consumer />
      </SectionContext.Provider>,
    )
    expect(screen.getByTestId('val').textContent).toBe('')
  })

  it('inner provider overrides outer', () => {
    render(
      <SectionContext.Provider value={{ basePath: 'outer' }}>
        <SectionContext.Provider value={{ basePath: 'inner' }}>
          <Consumer />
        </SectionContext.Provider>
      </SectionContext.Provider>,
    )
    expect(screen.getByTestId('val').textContent).toBe('inner')
  })
})
