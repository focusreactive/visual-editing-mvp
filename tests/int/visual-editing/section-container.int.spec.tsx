import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { SectionContext, useSectionContext } from '@/providers/SectionContext'
import { SectionContainer } from '@/components/SectionContainer'

const adminCtx = {
  isAdmin: true,
  docId: 'page1',
  collectionSlug: 'pages',
  adminBaseUrl: 'http://localhost:3000/admin',
}

function PathConsumer() {
  const ctx = useSectionContext()
  return <span data-testid="path">{ctx?.basePath ?? 'none'}</span>
}

describe('SectionContainer', () => {
  it('renders children without overlay when not admin', () => {
    render(
      <VisualEditingContext.Provider value={{ ...adminCtx, isAdmin: false }}>
        <SectionContainer basePath="layout.0" blockType="cta">
          <span>child</span>
        </SectionContainer>
      </VisualEditingContext.Provider>,
    )
    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('publishes basePath via SectionContext', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContainer basePath="layout.3" blockType="cta">
          <PathConsumer />
        </SectionContainer>
      </VisualEditingContext.Provider>,
    )
    expect(screen.getByTestId('path').textContent).toBe('layout.3')
  })

  it('shows block edit badge on hover when admin', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContainer basePath="layout.0" blockType="cta">
          <span>child</span>
        </SectionContainer>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    fireEvent.mouseEnter(container.firstChild as Element)
    const btn = screen.getByRole('button')
    expect(btn.textContent).toContain('cta')
  })
})
