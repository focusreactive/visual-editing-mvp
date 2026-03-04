# Visual Editing Plugin Design

**Date:** 2026-03-04
**Status:** Approved

## Goal

Make visual editing overlays automatic across all blocks and hero sections in previewable collections (Pages, Posts), with zero per-block configuration for blocks that use shared primitives.

## Scope

- Layout blocks (all block types in `layout` array)
- Hero section
- Pages and Posts collections
- Out of scope: Header, Footer, globals

## Architecture

### Three layers

**1. `VisualEditingProvider`** (exists, minor extension)
Sits at the page root. Provides `{ isAdmin, docId, collectionSlug, adminBaseUrl }` via context. No changes needed for this scope.

**2. `SectionContext` + `SectionContainer`** (new)
`SectionContainer` replaces the current `EditableBlock`. It:
- Renders the purple block-level hover ring (same as EditableBlock)
- Publishes `basePath` string down the tree via `SectionContext`

Examples:
- Layout block at index 2 → `basePath = 'layout.2'`
- Hero → `basePath = 'hero'`

**3. Smart primitives** (patched once)
`RichText`, `CMSLink`, and `Media` each read `SectionContext`. When in admin mode and context is present, they wrap themselves in `EditableField` using their convention field name:
- `RichText` → field `richText`
- `CMSLink` → field `link`
- `Media` → field `media`

Full path = `basePath + '.' + fieldName`.

When no `SectionContext` is present, primitives render exactly as today — zero breaking changes.

## Component changes

### New
- `SectionContext` — React context providing `{ basePath: string }`
- `SectionContainer` — replaces `EditableBlock`; renders block overlay + publishes basePath

### Modified
- `RichText` — self-annotates when SectionContext present + admin active
- `CMSLink` — self-annotates when SectionContext present + admin active
- `Media` — self-annotates when SectionContext present + admin active
- `EditableField` — remove `blockIndex` prop; accept `path` directly instead of computing `layout.${blockIndex}.${field}`
- `RenderBlocks.tsx` — use `SectionContainer` instead of `EditableBlock`
- `RenderHero.tsx` — wrap hero content in `SectionContainer basePath="hero"`
- `CallToActionBlock` — remove manual `EditableField` wrappers; goes back to clean JSX

### Unchanged
- `VisualEditingProvider` — no changes needed
- `VisualEditingBridge` — no changes needed
- All other blocks (Banner, Content, MediaBlock, etc.) — get overlays for free

## Array fields

For blocks with array fields, wrap each item in a nested `SectionContainer`:

```tsx
{columns.map((col, i) => (
  <SectionContainer key={i} basePath={`layout.${blockIndex}.columns.${i}`}>
    <RichText data={col.richText} />
    {col.enableLink && <CMSLink {...col.link} />}
  </SectionContainer>
))}
```

`blockIndex` flows from `RenderBlocks` as a prop, same as today.

## Developer effort per block type

| Block type | Work needed |
|---|---|
| No arrays, only primitives | Zero changes |
| Has array fields | One nested `SectionContainer` per array |
| Custom non-primitive fields | Manual `<EditableField path="...">` as fallback |

## Future plugin shape

```
@org/payload-visual-editing/
  providers/VisualEditingProvider
  components/SectionContainer
  components/EditableField          ← fallback for manual use
  primitives/RichText               ← drop-in replacement
  primitives/CMSLink
  primitives/Media
  admin/VisualEditingBridge
```

Projects import the plugin's primitives instead of their own, and get visual editing automatically.
