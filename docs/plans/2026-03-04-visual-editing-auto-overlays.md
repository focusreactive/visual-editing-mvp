# Visual Editing Auto-Overlays Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual `EditableField` wrappers with automatic overlays driven by a `SectionContext` path chain and smart primitives (`RichText`, `CMSLink`, `Media`).

**Architecture:** `SectionContainer` (client component) wraps each block/hero and publishes a `basePath` string via `SectionContext`. Shared primitives (`RichText`, `CMSLink`, `Media`) become `'use client'` components that read `SectionContext` and self-wrap in `EditableField` when in admin mode. `EditableField` computes its full field path from `SectionContext.basePath + field` instead of the old `layout.${blockIndex}.${field}` hardcode.

**Tech Stack:** Next.js 15 App Router, React context, Vitest + @testing-library/react, Payload CMS 3.78

---

### Task 1: Create `SectionContext`

**Files:**
- Create: `src/providers/SectionContext/index.tsx`
- Create: `tests/int/visual-editing/section-context.int.spec.tsx`

**Step 1: Write the failing test**

```tsx
// tests/int/visual-editing/section-context.int.spec.tsx
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
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/visual-editing/section-context.int.spec.tsx --reporter=verbose
```
Expected: FAIL — `Cannot find module '@/providers/SectionContext'`

**Step 3: Write implementation**

```tsx
// src/providers/SectionContext/index.tsx
'use client'

import { createContext, useContext } from 'react'

type SectionContextValue = { basePath: string }

export const SectionContext = createContext<SectionContextValue | null>(null)
export const useSectionContext = () => useContext(SectionContext)
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/int/visual-editing/section-context.int.spec.tsx --reporter=verbose
```
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/providers/SectionContext/index.tsx tests/int/visual-editing/section-context.int.spec.tsx
git commit -m "feat: add SectionContext for visual editing path chain"
```

---

### Task 2: Create `SectionContainer` (replaces `EditableBlock`)

`SectionContainer` does everything `EditableBlock` did (purple hover ring, block-level edit badge) plus publishes `basePath` via `SectionContext`.

**Files:**
- Create: `src/components/SectionContainer/index.tsx`
- Create: `tests/int/visual-editing/section-container.int.spec.tsx`

**Step 1: Write the failing test**

```tsx
// tests/int/visual-editing/section-container.int.spec.tsx
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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/visual-editing/section-container.int.spec.tsx --reporter=verbose
```
Expected: FAIL — `Cannot find module '@/components/SectionContainer'`

**Step 3: Write implementation**

```tsx
// src/components/SectionContainer/index.tsx
'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'
import { SectionContext } from '@/providers/SectionContext'

type Props = {
  basePath: string
  blockType?: string
  children: React.ReactNode
  className?: string
}

export const SectionContainer: React.FC<Props> = ({ basePath, blockType, children, className }) => {
  const ctx = useVisualEditing()
  const [hovered, setHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!ctx) return
    const { adminBaseUrl, collectionSlug, docId } = ctx
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 've:open-field', fieldPath: basePath, docId, collectionSlug },
        '*',
      )
    } else {
      window.open(`${adminBaseUrl}/collections/${collectionSlug}/${docId}`, '_blank')
    }
  }

  return (
    <SectionContext.Provider value={{ basePath }}>
      {ctx?.isAdmin ? (
        <div
          className={cn(
            'relative rounded transition-all duration-150',
            hovered && 'ring-2 ring-purple-400 ring-offset-4',
            className,
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered && blockType && (
            <button
              className="absolute -top-3 left-4 z-50 flex items-center gap-1 rounded bg-purple-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-purple-600 cursor-pointer border-0"
              onClick={handleClick}
            >
              ✏ {blockType}
            </button>
          )}
          {children}
        </div>
      ) : (
        <div className={className}>{children}</div>
      )}
    </SectionContext.Provider>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/int/visual-editing/section-container.int.spec.tsx --reporter=verbose
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/components/SectionContainer/index.tsx tests/int/visual-editing/section-container.int.spec.tsx
git commit -m "feat: add SectionContainer as smart replacement for EditableBlock"
```

---

### Task 3: Update `EditableField` — remove `blockIndex`, read path from `SectionContext`

**Files:**
- Modify: `src/components/EditableField/index.tsx`
- Modify: `tests/int/visual-editing/editable-field.int.spec.tsx`

**Step 1: Update the tests first**

Replace the entire test file content:

```tsx
// tests/int/visual-editing/editable-field.int.spec.tsx
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
```

**Step 2: Run tests to see them fail**

```bash
pnpm vitest run tests/int/visual-editing/editable-field.int.spec.tsx --reporter=verbose
```
Expected: Several FAIL — `blockIndex` prop missing, path computation wrong

**Step 3: Update `EditableField` implementation**

```tsx
// src/components/EditableField/index.tsx
'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'
import { useSectionContext } from '@/providers/SectionContext'

type Props = {
  field: string
  label?: string
  children: React.ReactNode
  className?: string
}

export const EditableField: React.FC<Props> = ({ field, label, children, className }) => {
  const ctx = useVisualEditing()
  const section = useSectionContext()
  const [hovered, setHovered] = useState(false)

  if (!ctx?.isAdmin) return <>{children}</>

  const { adminBaseUrl, collectionSlug, docId } = ctx
  const fieldPath = section?.basePath ? `${section.basePath}.${field}` : field

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.parent !== window) {
      window.parent.postMessage({ type: 've:open-field', fieldPath, docId, collectionSlug }, '*')
    } else {
      window.open(`${adminBaseUrl}/collections/${collectionSlug}/${docId}`, '_blank')
    }
  }

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <button
          className="absolute -top-5 right-0 z-50 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 cursor-pointer border-0 whitespace-nowrap"
          onClick={handleClick}
        >
          ✏ {label ?? field}
        </button>
      )}
      <div className={cn('rounded transition-all duration-150', hovered && 'ring-2 ring-blue-500 ring-offset-2')}>
        {children}
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/visual-editing/editable-field.int.spec.tsx --reporter=verbose
```
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/components/EditableField/index.tsx tests/int/visual-editing/editable-field.int.spec.tsx
git commit -m "feat: update EditableField to read basePath from SectionContext"
```

---

### Task 4: Patch `RichText` to self-annotate

**Files:**
- Modify: `src/components/RichText/index.tsx`
- Create: `tests/int/visual-editing/rich-text-overlay.int.spec.tsx`

**Step 1: Write the failing test**

```tsx
// tests/int/visual-editing/rich-text-overlay.int.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('@/utilities/getURL', () => ({
  getClientSideURL: () => 'http://localhost:3000',
}))

// Mock the lexical converter — it's not relevant to overlay behavior
vi.mock('@payloadcms/richtext-lexical/react', () => ({
  RichText: ({ className }: { className?: string }) => (
    <div className={className} data-testid="richtext-content">rich text</div>
  ),
  JSXConvertersFunction: () => ({}),
  LinkJSXConverter: () => ({}),
}))

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/visual-editing/rich-text-overlay.int.spec.tsx --reporter=verbose
```
Expected: FAIL — no button found on hover

**Step 3: Update `RichText` to self-annotate**

Replace `src/components/RichText/index.tsx` entirely:

```tsx
'use client'

import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'
import { useSectionContext } from '@/providers/SectionContext'
import { useVisualEditing } from '@/providers/VisualEditing'
import { EditableField } from '@/components/EditableField'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  const section = useSectionContext()
  const ve = useVisualEditing()

  const content = (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )

  if (section?.basePath && ve?.isAdmin) {
    return (
      <EditableField field="richText" label="Rich Text">
        {content}
      </EditableField>
    )
  }

  return content
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/int/visual-editing/rich-text-overlay.int.spec.tsx --reporter=verbose
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/components/RichText/index.tsx tests/int/visual-editing/rich-text-overlay.int.spec.tsx
git commit -m "feat: RichText self-annotates with EditableField overlay when in admin SectionContext"
```

---

### Task 5: Patch `CMSLink` to self-annotate

**Files:**
- Modify: `src/components/Link/index.tsx`
- Create: `tests/int/visual-editing/cms-link-overlay.int.spec.tsx`

**Step 1: Write the failing test**

```tsx
// tests/int/visual-editing/cms-link-overlay.int.spec.tsx
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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/visual-editing/cms-link-overlay.int.spec.tsx --reporter=verbose
```
Expected: FAIL — no button found on hover

**Step 3: Update `CMSLink`**

Replace `src/components/Link/index.tsx`:

```tsx
'use client'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

import type { Page, Post } from '@/payload-types'
import { useSectionContext } from '@/providers/SectionContext'
import { useVisualEditing } from '@/providers/VisualEditing'
import { EditableField } from '@/components/EditableField'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | null
  url?: string | null
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const {
    type,
    appearance = 'inline',
    children,
    className,
    label,
    newTab,
    reference,
    size: sizeFromProps,
    url,
  } = props

  const section = useSectionContext()
  const ve = useVisualEditing()

  const href =
    type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
      ? `${reference?.relationTo !== 'pages' ? `/${reference?.relationTo}` : ''}/${
          reference.value.slug
        }`
      : url

  if (!href) return null

  const size = appearance === 'link' ? 'clear' : sizeFromProps
  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  const linkElement =
    appearance === 'inline' ? (
      <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
        {label && label}
        {children && children}
      </Link>
    ) : (
      <Button asChild className={className} size={size} variant={appearance}>
        <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
          {label && label}
          {children && children}
        </Link>
      </Button>
    )

  if (section?.basePath && ve?.isAdmin) {
    return (
      <EditableField field="link" label={label ?? 'Link'}>
        {linkElement}
      </EditableField>
    )
  }

  return linkElement
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/int/visual-editing/cms-link-overlay.int.spec.tsx --reporter=verbose
```
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/components/Link/index.tsx tests/int/visual-editing/cms-link-overlay.int.spec.tsx
git commit -m "feat: CMSLink self-annotates with EditableField overlay when in admin SectionContext"
```

---

### Task 6: Patch `Media` to self-annotate

**Files:**
- Modify: `src/components/Media/index.tsx`
- Create: `tests/int/visual-editing/media-overlay.int.spec.tsx`

**Step 1: Write the failing test**

```tsx
// tests/int/visual-editing/media-overlay.int.spec.tsx
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
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/int/visual-editing/media-overlay.int.spec.tsx --reporter=verbose
```
Expected: FAIL

**Step 3: Update `Media`**

```tsx
// src/components/Media/index.tsx
'use client'

import React, { Fragment } from 'react'

import type { Props } from './types'

import { ImageMedia } from './ImageMedia'
import { VideoMedia } from './VideoMedia'
import { useSectionContext } from '@/providers/SectionContext'
import { useVisualEditing } from '@/providers/VisualEditing'
import { EditableField } from '@/components/EditableField'

export const Media: React.FC<Props> = (props) => {
  const { className, htmlElement = 'div', resource } = props
  const section = useSectionContext()
  const ve = useVisualEditing()

  const isVideo = typeof resource === 'object' && resource?.mimeType?.includes('video')
  const Tag = htmlElement || Fragment

  const content = (
    <Tag
      {...(htmlElement !== null
        ? {
            className,
          }
        : {})}
    >
      {isVideo ? <VideoMedia {...props} /> : <ImageMedia {...props} />}
    </Tag>
  )

  if (section?.basePath && ve?.isAdmin) {
    return (
      <EditableField field="media" label="Media">
        {content}
      </EditableField>
    )
  }

  return content
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/int/visual-editing/media-overlay.int.spec.tsx --reporter=verbose
```
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/components/Media/index.tsx tests/int/visual-editing/media-overlay.int.spec.tsx
git commit -m "feat: Media self-annotates with EditableField overlay when in admin SectionContext"
```

---

### Task 7: Update `RenderBlocks` — swap `EditableBlock` → `SectionContainer`

**Files:**
- Modify: `src/blocks/RenderBlocks.tsx`

**Step 1: Update the file**

```tsx
// src/blocks/RenderBlocks.tsx
import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { SectionContainer } from '@/components/SectionContainer'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <SectionContainer
                  key={index}
                  basePath={`layout.${index}`}
                  blockType={blockType}
                  className="my-16"
                >
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </SectionContainer>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
```

Note: `blockIndex` prop is removed from Block spread — blocks no longer need it for field overlays (they read basePath from SectionContext).

**Step 2: Run all visual editing tests to verify nothing broke**

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/blocks/RenderBlocks.tsx
git commit -m "feat: RenderBlocks uses SectionContainer with basePath instead of EditableBlock"
```

---

### Task 8: Update `RenderHero` — wrap in `SectionContainer`

**Files:**
- Modify: `src/heros/RenderHero.tsx`

**Step 1: Update the file**

```tsx
// src/heros/RenderHero.tsx
import React from 'react'

import type { Page } from '@/payload-types'

import { HighImpactHero } from '@/heros/HighImpact'
import { LowImpactHero } from '@/heros/LowImpact'
import { MediumImpactHero } from '@/heros/MediumImpact'
import { SectionContainer } from '@/components/SectionContainer'

const heroes = {
  highImpact: HighImpactHero,
  lowImpact: LowImpactHero,
  mediumImpact: MediumImpactHero,
}

export const RenderHero: React.FC<Page['hero']> = (props) => {
  const { type } = props || {}

  if (!type || type === 'none') return null

  const HeroToRender = heroes[type]

  if (!HeroToRender) return null

  return (
    <SectionContainer basePath="hero" blockType={type}>
      <HeroToRender {...props} />
    </SectionContainer>
  )
}
```

**Step 2: Run all visual editing tests**

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/heros/RenderHero.tsx
git commit -m "feat: RenderHero wraps hero in SectionContainer for automatic overlays"
```

---

### Task 9: Clean up `CallToActionBlock` — remove manual wrappers

Now that `RichText` and `CMSLink` self-annotate, the manual `EditableField` wrappers in `CallToActionBlock` are redundant (they'd cause double overlays).

**Files:**
- Modify: `src/blocks/CallToAction/Component.tsx`

**Step 1: Update the file**

```tsx
// src/blocks/CallToAction/Component.tsx
import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="container">
      <div className="bg-card rounded border-border border p-4 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div className="max-w-[48rem] flex items-center">
          {richText && <RichText className="mb-0" data={richText} enableGutter={false} />}
        </div>
        <div className="flex flex-col gap-8">
          {(links || []).map(({ link }, i) => (
            <CMSLink key={i} size="lg" {...link} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Run all visual editing tests**

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/blocks/CallToAction/Component.tsx
git commit -m "refactor: remove manual EditableField wrappers from CallToActionBlock — now automatic"
```

---

### Task 10: Add array support to `ContentBlock`

`ContentBlock` has a `columns` array. Each column has its own `richText` and optional `link`. Wrap each column in a nested `SectionContainer` with the correct basePath.

**Files:**
- Modify: `src/blocks/Content/Component.tsx`

**Step 1: Update the file**

```tsx
// src/blocks/Content/Component.tsx
'use client'

import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'
import { useSectionContext } from '@/providers/SectionContext'
import { SectionContainer } from '@/components/SectionContainer'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props
  const section = useSectionContext()

  const colsSpanClasses = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
  }

  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, richText, size } = col
            const colBasePath = section?.basePath
              ? `${section.basePath}.columns.${index}`
              : undefined

            return (
              <div
                className={cn(`col-span-4 lg:col-span-${colsSpanClasses[size!]}`, {
                  'md:col-span-2': size !== 'full',
                })}
                key={index}
              >
                {colBasePath ? (
                  <SectionContainer basePath={colBasePath}>
                    {richText && <RichText data={richText} enableGutter={false} />}
                    {enableLink && <CMSLink {...link} />}
                  </SectionContainer>
                ) : (
                  <>
                    {richText && <RichText data={richText} enableGutter={false} />}
                    {enableLink && <CMSLink {...link} />}
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
```

**Step 2: Run all visual editing tests**

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/blocks/Content/Component.tsx
git commit -m "feat: ContentBlock adds nested SectionContainer per column for array field overlays"
```

---

### Task 11: Delete `EditableBlock` (now superseded by `SectionContainer`)

**Files:**
- Delete: `src/components/EditableBlock/index.tsx`

**Step 1: Verify no remaining imports**

```bash
grep -r "EditableBlock" src/ --include="*.tsx" --include="*.ts"
```
Expected: no output (nothing imports it anymore)

**Step 2: Delete the file**

```bash
rm src/components/EditableBlock/index.tsx
```

**Step 3: Run all tests**

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
```
Expected: All tests PASS

**Step 4: Commit**

```bash
git commit -am "chore: delete EditableBlock — superseded by SectionContainer"
```

---

### Final verification

Run the full test suite and check for TypeScript errors:

```bash
pnpm vitest run tests/int/visual-editing/ --reporter=verbose
pnpm tsc --noEmit
```

Both should pass cleanly. Then test manually in the browser:
1. Open a page in Payload Live Preview
2. Hover over the hero — purple ring + rich text / link overlays should appear
3. Hover over a CTA block — purple ring + overlays on rich text and each link
4. Hover over a Content block — overlays per column
5. Click an overlay — admin navigates to the correct field
