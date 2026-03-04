import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { SectionContext } from '@/providers/SectionContext'
import { CMSLink } from '@/components/Link'

const adminCtx = {
  isAdmin: true,
  docId: 'page1',
  collectionSlug: 'pages',
  adminBaseUrl: 'http://localhost:3000/admin',
}

describe('CMSLink visual editing overlay', () => {
  it('renders without overlay when no SectionContext', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <CMSLink url="/test" label="Click me" />
      </VisualEditingContext.Provider>,
    )
    // only the link itself, no edit button
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows edit overlay on hover when admin + SectionContext present', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <CMSLink url="/test" label="Click me" />
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('button').textContent).toContain('link')
  })
})
