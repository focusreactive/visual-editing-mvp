# Visual Editing MVP — Design

**Date:** 2026-03-03
**Scope:** CTA block showcase; generalizes to all blocks later
**Approach:** Wrapper components + React context (no external deps, no stega)

---

## Goal

Show clickable overlays on editable sections when a Payload admin user browses the frontend. Hovering a field highlights it with a border and a floating edit badge that opens the Payload admin in a new tab.

---

## Visibility

Overlays appear for any logged-in Payload admin user, regardless of draft/preview mode.

---

## Granularity

Field-level overlays. Complex fields (richText, links, images) get one overlay for the top-level object — not per sub-field. Simple string fields get their own overlay.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/providers/VisualEditing/index.tsx` | Context + provider: auth check, docId, collectionSlug |
| `src/components/EditableField/index.tsx` | Hover-overlay wrapper rendered around each editable field |

### Modified files

| File | Change |
|------|--------|
| `src/app/(frontend)/[slug]/page.tsx` | Wrap render tree in `VisualEditingProvider` with `docId={page.id}` |
| `src/blocks/RenderBlocks.tsx` | Pass `blockIndex={index}` to each block component |
| `src/blocks/CallToAction/Component.tsx` | Wrap `richText` and `links` divs in `EditableField` |

### Data flow

```
page.tsx (has page.id)
  └─ VisualEditingProvider (docId, collectionSlug, isAdmin from /api/users/me)
       └─ RenderBlocks (passes blockIndex down)
            └─ CallToActionBlock (receives blockIndex)
                 ├─ EditableField field="richText" → /admin/.../pages/{id}#field-layout.{i}.richText
                 └─ EditableField field="links"    → /admin/.../pages/{id}#field-layout.{i}.links
```

---

## VisualEditingProvider

```tsx
// 'use client'
type VisualEditingContextValue = {
  isAdmin: boolean
  docId: string
  collectionSlug: string
  adminBaseUrl: string   // getClientSideURL() + "/admin"
}
```

- On mount: `GET /api/users/me` → sets `isAdmin = true` if a user is returned
- Context defaults to `null`; `EditableField` skips overlays when context is null
- Props: `docId: string`, `collectionSlug: string`, `children`

---

## EditableField

```tsx
// 'use client'
type Props = {
  field: string          // e.g. "richText" or "links"
  label?: string         // badge display name, defaults to field
  blockIndex: number     // for building #field-layout.{blockIndex}.{field} anchor
  children: React.ReactNode
}
```

- If `isAdmin` is false or context is null → renders `children` as-is, zero overhead
- On `isAdmin`: wraps children in a `relative` container div
- On hover: adds `ring-2 ring-blue-500 ring-offset-2 rounded` border
- Floating badge: `absolute top-1 right-1`, blue pill with pencil icon + label
- Badge renders as `<a target="_blank">` to:
  `{adminBaseUrl}/collections/{collectionSlug}/{docId}#field-layout.{blockIndex}.{field}`

---

## CTA Block integration

`CallToActionBlock` gains `blockIndex?: number` prop (passed by `RenderBlocks`).

```tsx
<EditableField field="richText" label="Rich Text" blockIndex={blockIndex}>
  {richText && <RichText data={richText} />}
</EditableField>

<EditableField field="links" label="Links" blockIndex={blockIndex}>
  {(links || []).map(({ link }, i) => <CMSLink key={i} size="lg" {...link} />)}
</EditableField>
```

---

## Admin URL format

`{adminBaseUrl}/collections/{collectionSlug}/{docId}#field-layout.{blockIndex}.{field}`

The hash is best-effort — Payload admin form inputs use IDs matching the field path. Even if scroll fails, the user lands on the correct document editor.

---

## Non-goals (out of scope for MVP)

- Stega encoding / Vercel Content Link protocol
- Sidebar/iframe panel for admin
- Field-level overlays within complex fields (e.g. individual nodes inside richText)
- Global provider in layout (auth check is per-page for now)
- Support for blocks other than CTA
