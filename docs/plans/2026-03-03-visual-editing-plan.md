# Visual Editing MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render clickable hover overlays on CTA block fields so any logged-in Payload admin can click straight into the correct document in the admin panel.

**Architecture:** A `VisualEditingProvider` client component wraps the page render tree, checks `/api/users/me` on mount, and exposes `{ isAdmin, docId, collectionSlug, adminBaseUrl }` via React context. An `EditableField` client component reads that context and, when `isAdmin` is true, shows a hover border + floating edit badge that opens the Payload admin in a new tab. The CTA block opts in by wrapping its `richText` and `links` sections in `EditableField`.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.78, Tailwind CSS v4, Vitest + jsdom + @testing-library/react

---

## Task 1: Create `VisualEditingProvider`

**Files:**
- Create: `src/providers/VisualEditing/index.tsx`
- Test: `tests/int/visual-editing/provider.int.spec.tsx`

---

**Step 1: Write the failing test**

Create `tests/int/visual-editing/provider.int.spec.tsx`:

```tsx
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
```

---

**Step 2: Run the test — verify it fails**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/visual-editing/provider.int.spec.tsx
```

Expected: `FAIL` — `Cannot find module '@/providers/VisualEditing'`

---

**Step 3: Write the implementation**

Create `src/providers/VisualEditing/index.tsx`:

```tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getClientSideURL } from '@/utilities/getURL'

type VisualEditingContextValue = {
  isAdmin: boolean
  docId: string
  collectionSlug: string
  adminBaseUrl: string
}

export const VisualEditingContext = createContext<VisualEditingContextValue | null>(null)

export const useVisualEditing = () => useContext(VisualEditingContext)

type Props = {
  docId: string
  collectionSlug: string
  children: React.ReactNode
}

export const VisualEditingProvider: React.FC<Props> = ({ docId, collectionSlug, children }) => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch(`${getClientSideURL()}/api/users/me`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  return (
    <VisualEditingContext.Provider
      value={{
        isAdmin,
        docId,
        collectionSlug,
        adminBaseUrl: `${getClientSideURL()}/admin`,
      }}
    >
      {children}
    </VisualEditingContext.Provider>
  )
}
```

---

**Step 4: Run the test — verify it passes**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/visual-editing/provider.int.spec.tsx
```

Expected: `PASS` — 3 tests green

---

**Step 5: Commit**

```bash
git add src/providers/VisualEditing/index.tsx tests/int/visual-editing/provider.int.spec.tsx
git commit -m "feat: add VisualEditingProvider context"
```

---

## Task 2: Create `EditableField` component

**Files:**
- Create: `src/components/EditableField/index.tsx`
- Test: `tests/int/visual-editing/editable-field.int.spec.tsx`

---

**Step 1: Write the failing test**

Create `tests/int/visual-editing/editable-field.int.spec.tsx`:

```tsx
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
```

---

**Step 2: Run the test — verify it fails**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/visual-editing/editable-field.int.spec.tsx
```

Expected: `FAIL` — `Cannot find module '@/components/EditableField'`

---

**Step 3: Write the implementation**

Create `src/components/EditableField/index.tsx`:

```tsx
'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'

type Props = {
  field: string
  label?: string
  blockIndex: number
  children: React.ReactNode
  className?: string
}

export const EditableField: React.FC<Props> = ({
  field,
  label,
  blockIndex,
  children,
  className,
}) => {
  const ctx = useVisualEditing()
  const [hovered, setHovered] = useState(false)

  if (!ctx?.isAdmin) return <>{children}</>

  const { adminBaseUrl, collectionSlug, docId } = ctx
  const href = `${adminBaseUrl}/collections/${collectionSlug}/${docId}#field-layout.${blockIndex}.${field}`

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-1 right-1 z-50 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600"
          onClick={(e) => e.stopPropagation()}
        >
          ✏ {label ?? field}
        </a>
      )}
      <div
        className={cn(
          'rounded transition-all duration-150',
          hovered && 'ring-2 ring-blue-500 ring-offset-2',
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

---

**Step 4: Run the test — verify it passes**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/visual-editing/editable-field.int.spec.tsx
```

Expected: `PASS` — 6 tests green

---

**Step 5: Commit**

```bash
git add src/components/EditableField/index.tsx tests/int/visual-editing/editable-field.int.spec.tsx
git commit -m "feat: add EditableField overlay component"
```

---

## Task 3: Thread `blockIndex` through `RenderBlocks`

**Files:**
- Modify: `src/blocks/RenderBlocks.tsx`

No new tests needed — this is a prop pass-through. The existing TypeScript build verifies correctness.

---

**Step 1: Edit `RenderBlocks.tsx`**

In `src/blocks/RenderBlocks.tsx`, change the block render line from:

```tsx
              {/* @ts-expect-error there may be some mismatch between the expected types here */}
              <Block {...block} disableInnerContainer />
```

to:

```tsx
              {/* @ts-expect-error there may be some mismatch between the expected types here */}
              <Block {...block} blockIndex={index} disableInnerContainer />
```

The `@ts-expect-error` comment already suppresses type errors on this line, so adding the extra prop is safe.

---

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no new errors

---

**Step 3: Commit**

```bash
git add src/blocks/RenderBlocks.tsx
git commit -m "feat: pass blockIndex from RenderBlocks to block components"
```

---

## Task 4: Update `CallToActionBlock` to use `EditableField`

**Files:**
- Modify: `src/blocks/CallToAction/Component.tsx`

---

**Step 1: Replace `Component.tsx` contents**

Open `src/blocks/CallToAction/Component.tsx` and replace the entire file with:

```tsx
import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { EditableField } from '@/components/EditableField'

export const CallToActionBlock: React.FC<CTABlockProps & { blockIndex?: number }> = ({
  links,
  richText,
  blockIndex = 0,
}) => {
  return (
    <div className="container">
      <div className="bg-card rounded border-border border p-4 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div className="max-w-[48rem] flex items-center">
          <EditableField field="richText" label="Rich Text" blockIndex={blockIndex}>
            {richText && <RichText className="mb-0" data={richText} enableGutter={false} />}
          </EditableField>
        </div>
        <div className="flex flex-col gap-8">
          <EditableField field="links" label="Links" blockIndex={blockIndex}>
            {(links || []).map(({ link }, i) => {
              return <CMSLink key={i} size="lg" {...link} />
            })}
          </EditableField>
        </div>
      </div>
    </div>
  )
}
```

---

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors

---

**Step 3: Commit**

```bash
git add src/blocks/CallToAction/Component.tsx
git commit -m "feat: add EditableField overlays to CallToActionBlock"
```

---

## Task 5: Wire `VisualEditingProvider` into `page.tsx`

**Files:**
- Modify: `src/app/(frontend)/[slug]/page.tsx`

---

**Step 1: Edit `page.tsx`**

Add the import at the top of `src/app/(frontend)/[slug]/page.tsx`:

```tsx
import { VisualEditingProvider } from '@/providers/VisualEditing'
```

Then wrap the `<RenderHero>` and `<RenderBlocks>` in `VisualEditingProvider`. Change the return block from:

```tsx
  return (
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
```

to:

```tsx
  return (
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <VisualEditingProvider docId={String(page.id)} collectionSlug="pages">
        <RenderHero {...hero} />
        <RenderBlocks blocks={layout} />
      </VisualEditingProvider>
    </article>
  )
```

Note: `String(page.id)` handles both numeric and string IDs from Payload/PostgreSQL.

---

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors

---

**Step 3: Run all tests**

```bash
pnpm test:int
```

Expected: all tests pass (existing API test + new visual editing tests)

---

**Step 4: Manual smoke test**

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3000` in the browser
3. Log into Payload admin at `http://localhost:3000/admin` in a separate tab (so the session cookie is set)
4. Return to `http://localhost:3000` — navigate to a page that has a CTA block
5. Hover over the rich text area → should see a blue ring border + "✏ Rich Text" badge
6. Hover over the links area → should see a blue ring border + "✏ Links" badge
7. Click the badge → should open the Payload admin page editor in a new tab
8. Log out of admin and verify overlays disappear on the frontend

---

**Step 5: Commit**

```bash
git add src/app/\(frontend\)/\[slug\]/page.tsx
git commit -m "feat: wire VisualEditingProvider into page render tree"
```
