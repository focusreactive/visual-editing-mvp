# Visual Editing MVP

A visual editing system built on top of the Payload Website Template. Admin users can click directly on frontend content to navigate to the exact field in the Payload admin panel — with automatic section expansion, field focus, and a sweep animation.

**Status: MVP / Work in Progress**

## Architectural Approaches to Visual Editing

There are two fundamentally different ways to connect frontend content to CMS fields. This section documents both, their tradeoffs, and why this MVP uses the approach it does.

### Approach 1: Steganography (Stega) + Content Source Maps

This is the approach pioneered by Sanity and adopted by Vercel's `@vercel/stega`. It works at the **data layer**.

**How it works:**

1. The CMS generates **content source maps** — a JSON mapping from every string value in the API response to its origin field path and document ID.
2. At data fetch time, a library like `@vercel/stega` encodes this metadata into string values using invisible zero-width Unicode characters.
3. On the frontend, a toolbar SDK (like `@vercel/visual-editing`) detects hover/click on any text, reads the hidden characters, and knows exactly which CMS field produced that text.
4. The toolbar then opens an edit intent URL or sends a message to the CMS admin.

```
CMS Database
  ↓
API Response + Content Source Map
  ↓
Stega encoding (invisible chars injected into strings)
  ↓
Frontend renders strings (with hidden metadata)
  ↓
Toolbar SDK reads metadata on hover/click
  ↓
Opens edit UI for the exact field
```

**Advantages:**
- Zero per-component work — every string field is automatically editable
- Character-level precision — can highlight the exact text that maps to a field
- Works with server components — encoding happens at data fetch, not render
- Framework-agnostic — works with any frontend (React, Vue, vanilla HTML)

**Disadvantages:**
- **Requires content source maps from the CMS** — this is the fundamental blocker
- Only works for string fields — rich text (Lexical), media, relationships, and other complex fields cannot be stega-encoded
- Invisible characters can break `textContent` comparisons, copy-paste, and some SEO tools
- Requires a third-party toolbar SDK on the frontend
- No control over the edit UX — you get the toolbar's UI, not your own

**The Payload blocker:** Payload CMS has zero content source map infrastructure — no `@vercel/stega` dependency, no source map generation, no field provenance tracking. This is not a gap that can be bridged from the outside. Content source maps require the CMS itself to track the origin of every string value through its entire query pipeline — population of relationships, localization resolution, access control filtering, block/array field traversal, and draft/published version selection. Every string in the API response needs a reverse pointer to its exact database path and document ID. Sanity built this into their query engine (GROQ) from the ground up; for Payload, this would mean fundamental changes to how `payload.find()` and the REST/GraphQL APIs resolve and return data. It is not on Payload's public roadmap.

### Approach 2: React Context + Component Annotation (This MVP)

This is the approach used here. It works at the **component layer**.

**How it works:**

1. A `VisualEditingProvider` at the page root checks if the user is a Payload admin.
2. `SectionContainer` wraps each block/section and publishes a `basePath` via React context.
3. "Smart primitives" (`RichText`, `CMSLink`, `Media`) read the context and wrap themselves in `EditableField` overlays that know their full field path.
4. Clicking an overlay sends a `postMessage` to the admin panel with the field path.
5. The `VisualEditingBridge` in the admin parses the path, expands sections, and focuses the field.

```
Page Component
  ↓
VisualEditingProvider (isAdmin? docId? collectionSlug?)
  ↓
SectionContainer (basePath="layout.0")
  ↓ publishes SectionContext
  ↓
RichText / CMSLink / EditableField
  ↓ reads basePath, appends field name
  ↓ renders green overlay on hover
  ↓
Click → postMessage({ fieldPath: "layout.0.richText" })
  ↓
VisualEditingBridge (admin)
  ↓ expands sections → scrolls → focuses → sweep animation
```

**Advantages:**
- Works with ALL field types — rich text (Lexical), media, links, relationships, custom fields
- Full control over the overlay UX — custom colors, animations, sweep effects
- No invisible characters polluting content
- No external dependencies — pure React context
- Works with Payload out of the box — no source map infrastructure needed
- Can trigger complex admin interactions (expand collapsibles, switch tabs, focus specific inputs)

**Disadvantages:**
- Requires per-component work — each field type needs to be wrapped or made "smart"
- Field-level precision only — can't highlight individual characters within a string
- Requires `'use client'` — overlays need React state for hover/click
- Path construction is manual — wrong paths silently fail (field not found, wrong section expanded)
- Tightly coupled to Payload's admin DOM — relies on CSS class names and ID conventions that may change between versions

### Comparison

| | Stega + Source Maps | Context + Annotation (this MVP) |
|---|---|---|
| **CMS requirement** | Content source maps (Payload: not available) | Admin user check via API (works today) |
| **String fields** | Automatic | Need EditableField wrapper |
| **Rich text** | Not supported | Supported (Lexical focus) |
| **Media / uploads** | Not supported | Supported |
| **Links / relationships** | Not supported | Supported |
| **Precision** | Character-level | Field-level |
| **Server components** | Compatible | Requires `'use client'` |
| **Admin interaction** | Opens edit URL | Expands sections, focuses input, sweep animation |
| **Maintenance** | CMS must maintain source maps | Must track Payload DOM conventions |
| **Setup per block** | Zero | Smart primitives + editField for arrays |

### Why This MVP Uses the Context Approach

Stega is not a viable option for Payload today and won't be without core CMS changes:

1. **Payload has no content source maps** — the fundamental prerequisite for stega doesn't exist and would require deep changes to Payload's query engine to build.
2. **Stega only covers strings** — even if source maps existed, rich text (Lexical), media uploads, links, and relationships can't be stega-encoded. These are the majority of editable fields in a typical Payload site.
3. **The context approach works today** — no CMS changes needed. It covers all field types and provides richer admin interactions (section expansion, field focus, sweep animations) than a stega toolbar could.

If Payload ever adds content source map support, stega could complement this system for plain text fields (titles, labels, descriptions) — giving character-level precision with zero component work. But the context-based annotation would still be needed for complex fields. The two approaches are complementary, not competing.

---

## How It Works

The system has three layers:

```
Frontend (preview)                         Admin Panel
┌──────────────────────────┐        ┌──────────────────────────┐
│ VisualEditingProvider    │        │ VisualEditingBridge      │
│   ├─ SectionContainer    │──msg──▶│   ├─ parse fieldPath     │
│   │    ├─ RichText       │        │   ├─ switch tab          │
│   │    ├─ CMSLink        │        │   ├─ expand rows         │
│   │    └─ EditableField  │        │   ├─ scroll & focus      │
│   └─ ...                 │        │   └─ sweep animation     │
└──────────────────────────┘        └──────────────────────────┘
```

1. **VisualEditingProvider** — page-level context that checks if the current user is a Payload admin. Provides `isAdmin`, `docId`, `collectionSlug`, `adminBaseUrl` to all descendants.

2. **SectionContainer + EditableField** — overlay components that render green outlines and edit badges on hover. Clicking sends a `ve:open-field` postMessage to the admin panel with the dot-separated field path.

3. **VisualEditingBridge** — admin-side component that receives messages, expands collapsed sections, switches tabs, scrolls to the target field, focuses the input, and plays a sweep animation.

## Architecture

### Field Path Convention

Every editable element builds a dot-separated path matching Payload's internal field structure:

```
layout.0.richText              → block 0, richText field
layout.0.links.1.link.label    → block 0, links array index 1, link group, label
hero.richText                  → hero section rich text
layout.3.cards.0.link.label    → block 3, cards array index 0, link label
```

Paths are composed by combining `SectionContext.basePath` + the field name passed to `EditableField`.

### Payload Admin DOM ID Conventions

The bridge maps field paths to Payload's DOM elements:

| Path segment | DOM ID pattern | Example |
|---|---|---|
| Array index | `{prefix}-row-{index}` | `layout.0` → `layout-row-0` |
| Nested array | `{parent-dashed}-row-{index}` | `layout.0.links.1` → `layout-0-links-row-1` |
| Field | `field-{path-with-__}` | `layout.0.links.1.link.label` → `field-layout__0__links__1__link__label` |

**Known exception:** Lexical rich text fields do NOT get a `field-` id on their wrapper. The bridge falls back to the row element and focuses the first top-level field.

### Message Protocol

```js
// Frontend → Admin
{
  type: "ve:open-field",
  fieldPath: "layout.2.links.0.link.label",
  docId: "abc-123",
  collectionSlug: "pages"
}
```

### Core Files

| File | Purpose |
|---|---|
| `src/providers/VisualEditing/index.tsx` | Page-level context, admin detection via `/api/users/me` |
| `src/providers/SectionContext/index.tsx` | Provides `basePath` to descendant fields |
| `src/components/SectionContainer/index.tsx` | Block-level overlay (green outline + badge), provides SectionContext |
| `src/components/EditableField/index.tsx` | Field-level overlay (green outline + badge) |
| `src/components/VisualEditingBridge/index.tsx` | Admin-side: parses paths, expands rows, focuses fields, sweep animation |
| `src/components/RichText/index.tsx` | Auto-wraps in EditableField when in admin SectionContext |
| `src/components/Link/index.tsx` | Auto-wraps in EditableField, supports `editField` prop for array paths |
| `src/blocks/RenderBlocks.tsx` | Wraps each layout block in SectionContainer |
| `src/heros/RenderHero.tsx` | Wraps hero in SectionContainer |

## Adding Visual Editing to a New Block

### Step 1: Register the block

Add the config to `src/collections/Pages/index.ts` in the `blocks` array and register its component in `src/blocks/RenderBlocks.tsx`:

```tsx
// RenderBlocks.tsx
import { MyNewBlock } from '@/blocks/MyNewBlock/Component'

const blockComponents = {
  // ...existing blocks
  myNewBlock: MyNewBlock,
}
```

`RenderBlocks` automatically wraps every block in a `SectionContainer` with `basePath={layout.${index}}`.

### Step 2: Use smart primitives

Three components auto-annotate themselves when inside a `SectionContext`:

- **`RichText`** — `field="richText"`
- **`CMSLink`** — `field="link.label"` (targets the label input in admin)
- **`Media`** — `field="media"`

Just render them in your block component. Overlays are automatic.

### Step 3: Handle array fields

When a primitive is inside a `.map()`, pass the correct path with the array index:

```tsx
// WRONG — sends "link.label", admin can't find the array row
{links.map(({ link }, i) => (
  <CMSLink {...link} />
))}

// CORRECT — sends "links.0.link.label", admin expands the right row
{links.map(({ link }, i) => (
  <CMSLink {...link} editField={`links.${i}.link`} />
))}
```

### Step 4: Nested sub-items

For blocks with independently editable sub-items (like cards or columns), wrap each item in its own `SectionContainer`:

```tsx
{cards.map((card, index) => {
  const cardBasePath = section?.basePath
    ? `${section.basePath}.cards.${index}`
    : undefined

  return cardBasePath ? (
    <SectionContainer key={index} basePath={cardBasePath}>
      {/* primitives here use the card's basePath */}
    </SectionContainer>
  ) : (
    <div key={index}>{/* non-admin render */}</div>
  )
})}
```

### Step 5: Custom fields

For fields that aren't RichText/CMSLink/Media, wrap manually with `EditableField`:

```tsx
import { EditableField } from '@/components/EditableField'

<EditableField field="title" label="Title">
  <h1>{title}</h1>
</EditableField>
```

The `field` value must match the Payload field slug.

### Checklist

- [ ] Block config added to Pages collection
- [ ] Block component registered in RenderBlocks
- [ ] Smart primitives (RichText, CMSLink, Media) used where applicable
- [ ] Array-rendered CMSLinks pass `editField={`arrayName.${i}.link`}`
- [ ] Nested sub-items wrapped in SectionContainer with correct basePath
- [ ] Custom fields wrapped in EditableField with matching Payload field slug
- [ ] Clicking overlay in preview expands the correct section in admin
- [ ] Correct field receives focus after expansion
- [ ] Sweep animation plays on the focused field

## Available Block Types

| Block | Smart primitives used | Notes |
|---|---|---|
| CallToAction | RichText, CMSLink (array) | Links use `editField={links.${i}.link}` |
| Content | RichText, CMSLink | Columns wrapped in SectionContainer |
| Archive | RichText | Select/relationship fields not yet editable |
| MediaBlock | Media | |
| Banner | RichText | |
| ImageText | RichText, CMSLink, Media | Single link (no array) |
| CardGrid | CMSLink | Cards wrapped in SectionContainer |
| Code | — | No editable primitives |
| Form | — | Form fields not applicable |

## Known Issues and Future Improvements

### 1. No sweep animation on preview side

When clicking a section or field overlay, the green sweep animation only plays in the admin panel (left side). The preview iframe (right side) does not show any visual feedback confirming what was clicked. Adding a sweep or flash on the preview element that was clicked would improve the feedback loop.

### 2. Expansion timing lag

When clicking a deeply nested field, the bridge sequentially expands collapsible rows with 500ms delays. During this expansion, Payload's height transition animation can cause a brief moment of broken/shifting UI before the content settles. The current delays (500ms between expansions, 400ms before focus) are conservative but still occasionally show this artifact. A more robust approach would be to observe DOM mutations or listen for `transitionend` events instead of using fixed timeouts.

### 3. Standalone draft mode overlay

The visual editing overlays currently work in two contexts:
- **Inside Payload's live preview iframe** — clicks send postMessage to the admin parent
- **Standalone page visits** — clicking "Edit in CMS" opens the admin in a new tab

In standalone mode, we open the correct admin page but do NOT focus on the specific field. A future improvement would be to pass the `fieldPath` as a URL parameter (e.g., `?ve-focus=layout.0.richText`) and have the VisualEditingBridge read it on page load to auto-expand and focus. This would give the same precise field navigation experience outside of the iframe context.

### 4. Lexical rich text fields lack DOM IDs

Payload's Lexical rich text fields do not render a `field-{path}` id on their wrapper element, unlike text inputs and other field types. The bridge works around this by falling back to the parent row element and focusing the first top-level field. This means if a rich text field is not the first field in a block, the wrong field may receive focus. A more precise solution would be to search for the field by its `name` attribute or label text.

### 5. Select/relationship fields not focusable

The current focus selector targets `[data-lexical-editor], input:not([type="hidden"]), textarea`. React-select based fields (dropdowns, relationship pickers) use a hidden input that doesn't respond to `.focus()` in a useful way. These field types are not yet supported for auto-focus.

---

## Original Template Documentation

This project is built on the official [Payload Website Template](https://github.com/payloadcms/payload/blob/main/templates/website).

### Quick Start

```bash
pnpx create-payload-app my-project -t website
cd my-project && cp .env.example .env
pnpm install && pnpm dev
```

Open `http://localhost:3000`.

### Collections

- **Users** — auth-enabled, access to admin panel
- **Pages** — layout builder enabled, draft preview
- **Posts** — blog/news content, layout builder enabled
- **Media** — uploads with pre-configured sizes and focal point
- **Categories** — taxonomy for grouping posts

### Layout Builder

Create unique page layouts using blocks: Hero, Content, Media, Call To Action, Archive, ImageText, CardGrid.

### Draft Preview & Live Preview

All posts and pages are draft-enabled. The template supports both draft preview (via custom URL redirect) and live preview (SSR rendering while editing).

### SEO, Search, Redirects

Pre-configured with official Payload plugins for SEO, search, and redirects.

### Production

```bash
pnpm build
pnpm start
```

See the [Payload deployment docs](https://payloadcms.com/docs/production/deployment) for hosting options.
