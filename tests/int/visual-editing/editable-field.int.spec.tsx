import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

import { VisualEditingContext } from '@/providers/VisualEditing'
import { SectionContext } from '@/providers/SectionContext'
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
      <EditableField field="richText">
        <span>content</span>
      </EditableField>,
    )
    expect(screen.getByText('content')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders children as-is when isAdmin is false', () => {
    render(
      <VisualEditingContext.Provider value={{ ...adminCtx, isAdmin: false }}>
        <EditableField field="richText">
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows no badge before hover when isAdmin is true', () => {
    render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <EditableField field="richText" label="Rich Text">
            <span>content</span>
          </EditableField>
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows edit badge on hover and sends postMessage with correct path', () => {
    const postMessageSpy = vi.fn()
    Object.defineProperty(window, 'parent', { value: { postMessage: postMessageSpy }, writable: true })

    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.2' }}>
          <EditableField field="richText" label="Rich Text">
            <span>content</span>
          </EditableField>
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )

    fireEvent.mouseEnter(container.firstChild as Element)
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('Rich Text')

    fireEvent.click(button)
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 've:open-field', fieldPath: 'layout.2.richText' }),
      '*',
    )
  })

  it('hides badge on mouse leave', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <EditableField field="richText" label="Rich Text">
            <span>content</span>
          </EditableField>
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('button')).toBeTruthy()
    fireEvent.mouseLeave(container.firstChild as Element)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('defaults label to field name when label prop is omitted', () => {
    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <SectionContext.Provider value={{ basePath: 'layout.0' }}>
          <EditableField field="links">
            <span>content</span>
          </EditableField>
        </SectionContext.Provider>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    expect(screen.getByRole('button').textContent).toContain('links')
  })

  it('uses field as full path when no SectionContext is present', () => {
    const postMessageSpy = vi.fn()
    Object.defineProperty(window, 'parent', { value: { postMessage: postMessageSpy }, writable: true })

    const { container } = render(
      <VisualEditingContext.Provider value={adminCtx}>
        <EditableField field="hero.richText" label="Rich Text">
          <span>content</span>
        </EditableField>
      </VisualEditingContext.Provider>,
    )
    fireEvent.mouseEnter(container.firstChild as Element)
    fireEvent.click(screen.getByRole('button'))
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ fieldPath: 'hero.richText' }),
      '*',
    )
  })
})
