import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { EditableField } from '@/components/EditableField'

const adminCtx = {
  isAdmin: true,
  docId: 'page1',
  collectionSlug: 'pages',
  adminBaseUrl: 'http://localhost:3000/admin',
}

describe('EditableField', () => {
  it('renders children as-is when there is no context', () => {
    render(
      <EditableField field="richText" blockIndex={0}>
        <span>content</span>
      </EditableField>,
    )
    expect(screen.getByText('content')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders children as-is when isAdmin is false', () => {
    render(
      <VisualEditingContext.Provider value={{ ...adminCtx, isAdmin: false }}>
        <EditableField field="richText" blockIndex={0}>
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )
    expect(screen.getByText('content')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows no badge before hover when isAdmin is true', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <EditableField field="richText" label="Rich Text" blockIndex={0}>
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows edit badge with correct href on hover', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <EditableField field="richText" label="Rich Text" blockIndex={2}>
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )

    fireEvent.mouseEnter(container.firstChild as Element)

    const link = screen.getByRole('link')
    expect(link.textContent).toContain('Rich Text')
    expect(link.getAttribute('href')).toBe(
      'http://localhost:3000/admin/collections/pages/page1#field-layout.2.richText',
    )
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('hides badge on mouse leave', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <EditableField field="richText" label="Rich Text" blockIndex={0}>
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )

    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('link')).toBeTruthy()

    fireEvent.mouseLeave(container.firstChild as Element)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('defaults label to field name when label prop is omitted', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <EditableField field="links" blockIndex={0}>
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )

    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('link').textContent).toContain('links')
  })
})
