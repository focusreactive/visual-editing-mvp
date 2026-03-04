import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

// Mock the lexical converter — not relevant to overlay behavior
vi.mock('@payloadcms/richtext-lexical/react', () => ({
  RichText: ({ className }: { className?: string }) => (
    <div className={className} data-testid="richtext-content">rich text</div>
  ),
  JSXConvertersFunction: () => ({}),
  LinkJSXConverter: () => ({}),
}))

vi.mock('@payloadcms/richtext-lexical', () => ({
  DefaultNodeTypes: {},
  SerializedBlockNode: {},
  SerializedLinkNode: {},
}))

vi.mock('@/blocks/MediaBlock/Component', () => ({ MediaBlock: () => null }))
vi.mock('@/blocks/Code/Component', () => ({ CodeBlock: () => null }))
vi.mock('@/blocks/Banner/Component', () => ({ BannerBlock: () => null }))
vi.mock('@/blocks/CallToAction/Component', () => ({ CallToActionBlock: () => null }))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { SectionContext } from '@/providers/SectionContext'
import RichText from '@/components/RichText'

const adminCtx = {
  isAdmin: true,
  docId: 'page1',
  collectionSlug: 'pages',
  adminBaseUrl: 'http://localhost:3000/admin',
}

describe('RichText visual editing overlay', () => {
  it('renders without overlay when no SectionContext', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <RichText data={{} as any} />
      </VisualEditingContext.Provider>,
    )
    expect(screen.getByTestId('richtext-content')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders without overlay when not admin', () => {
    render(
      <VisualEditingContext.Provider value={{ ...adminCtx, isAdmin: false }}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <RichText data={{} as any} />
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows edit overlay on hover when admin + SectionContext present', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.1' }}>
          <RichText data={{} as any} />
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('button').textContent).toContain('richText')
  })
})
