import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Mock getClientSideURL before importing the module under test
vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

// Imported after mock is set up
import { VisualEditingProvider, useVisualEditing } from '@/providers/VisualEditing'

const Consumer = () => {
  const ctx = useVisualEditing()
  return <div data-testid="ctx">{JSON.stringify(ctx)}</div>
}

describe('VisualEditingProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('exposes isAdmin=false when /api/users/me returns no user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch

    render(
      <VisualEditingProvider docId="doc1" collectionSlug="pages">
        <Consumer />
      </VisualEditingProvider>,
    )

    await waitFor(() => {
      const val = JSON.parse(screen.getByTestId('ctx').textContent!)
      expect(val.isAdmin).toBe(false)
      expect(val.docId).toBe('doc1')
      expect(val.collectionSlug).toBe('pages')
      expect(val.adminBaseUrl).toBe('http://localhost:3000/admin')
    })
  })

  it('exposes isAdmin=true when /api/users/me returns a user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { id: 'u1' } }),
    }) as unknown as typeof fetch

    render(
      <VisualEditingProvider docId="doc2" collectionSlug="pages">
        <Consumer />
      </VisualEditingProvider>,
    )

    await waitFor(() => {
      const val = JSON.parse(screen.getByTestId('ctx').textContent!)
      expect(val.isAdmin).toBe(true)
    })
  })

  it('returns null from useVisualEditing when used outside provider', () => {
    render(<Consumer />)
    expect(screen.getByTestId('ctx').textContent).toBe('null')
  })
})
