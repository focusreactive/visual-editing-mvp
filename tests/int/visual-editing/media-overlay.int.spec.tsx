import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))
vi.mock('@/components/Media/ImageMedia', () => ({
  ImageMedia: () => <img alt="test" data-testid="image" />,
}))
vi.mock('@/components/Media/VideoMedia', () => ({
  VideoMedia: () => <video data-testid="video" />,
}))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { SectionContext } from '@/providers/SectionContext'
import { Media } from '@/components/Media'

const adminCtx = {
  isAdmin: true,
  docId: 'page1',
  collectionSlug: 'pages',
  adminBaseUrl: 'http://localhost:3000/admin',
}

describe('Media visual editing overlay', () => {
  it('renders without overlay when no SectionContext', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <Media resource={null} />
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows edit overlay on hover when admin + SectionContext present', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <Media resource={null} />
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('button').textContent).toContain('media')
  })
})
