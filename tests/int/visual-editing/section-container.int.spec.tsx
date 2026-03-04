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
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContainer basePath="layout.0" blockType="cta">
          <span>child</span>
        </SectionContainer>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    fireEvent.mouseEnter(screen.getByTestId('section-wrapper'))
    const btn = screen.getByRole('button')
    expect(btn.textContent).toContain('cta')
  })

  it('renders children without overlay when context is absent', () => {
    render(
      <SectionContainer basePath="layout.0" blockType="cta">
        <span>child</span>
      </SectionContainer>,
    )
    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('click sends postMessage with correct payload', () => {
    const postMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

    // Make window.parent !== window so the postMessage branch is taken
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessageSpy },
      configurable: true,
    })

    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContainer basePath="layout.0" blockType="cta">
          <span>child</span>
        </SectionContainer>
      </VisualEditingContext.Provider>,
    )

    fireEvent.mouseEnter(screen.getByTestId('section-wrapper'))
    const btn = screen.getByRole('button')
    fireEvent.click(btn)

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 've:open-field', fieldPath: 'layout.0', docId: 'page1', collectionSlug: 'pages' },
      'http://localhost:3000',
    )

    postMessageSpy.mockRestore()
    // Restore window.parent to window itself
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
  })
})
