'use client'

import { useEffect } from 'react'

const FOCUS_SELECTOR =
  '[data-lexical-editor="true"], input:not([type="hidden"]), textarea'

/**
 * Parse a dot-separated fieldPath into row IDs (for collapsible sections)
 * and an optional fieldId (for the leaf field element).
 *
 * Examples:
 *   'layout.0'                   → rowIds: ['layout-row-0'],                         fieldId: null
 *   'layout.0.richText'          → rowIds: ['layout-row-0'],                         fieldId: 'field-layout__0__richText'
 *   'layout.0.links.1'           → rowIds: ['layout-row-0', 'layout-0-links-row-1'], fieldId: null
 *   'layout.0.links.1.link.url'  → rowIds: ['layout-row-0', 'layout-0-links-row-1'], fieldId: 'field-layout__0__links__1__link__url'
 */
function parseFieldPath(fieldPath: string) {
  const parts = fieldPath.split('.')
  const rowIds: string[] = []

  for (let i = 0; i < parts.length; i++) {
    if (!isNaN(parseInt(parts[i]!, 10))) {
      const prefix = parts.slice(0, i).join('-')
      rowIds.push(`${prefix}-row-${parts[i]}`)
    }
  }

  const lastPart = parts[parts.length - 1]!
  const endsWithField = isNaN(parseInt(lastPart, 10)) && rowIds.length > 0
  const fieldId = endsWithField ? `field-${fieldPath.replace(/\./g, '__')}` : null

  return { rowIds, fieldId }
}

/**
 * Focus the first matching input within a container's top-level .field-type children.
 */
function focusTopLevelField(container: HTMLElement) {
  const renderFields = container.querySelector('.render-fields')
  if (!renderFields) return
  for (const child of renderFields.children) {
    if (!child.classList.contains('field-type')) continue
    const focusable = child.querySelector<HTMLElement>(FOCUS_SELECTOR)
    if (focusable) {
      focusable.focus()
      return
    }
  }
}

/**
 * Sequentially uncollapse all rows, then scroll to the target and focus.
 */
function expandAndFocus(rowIds: string[], fieldId: string | null) {
  let delay = 0
  const EXPAND_DELAY = 400 // must exceed Payload's 300ms collapse transition

  for (const rowId of rowIds) {
    setTimeout(() => {
      const row = document.getElementById(rowId)
      const toggle = row?.querySelector<HTMLButtonElement>('.collapsible__toggle')
      if (toggle?.classList.contains('collapsible__toggle--collapsed')) toggle.click()
    }, delay)
    delay += EXPAND_DELAY
  }

  setTimeout(() => {
    // Try the specific field element first, fall back to the deepest row
    const fieldEl = fieldId ? document.getElementById(fieldId) : null
    const fallbackEl = rowIds.length
      ? document.getElementById(rowIds[rowIds.length - 1]!)
      : null
    const scrollTarget = fieldEl ?? fallbackEl
    if (!scrollTarget) return

    const bounds = scrollTarget.getBoundingClientRect()
    window.scrollBy({ behavior: 'smooth', top: bounds.top - 200 })

    setTimeout(() => {
      if (fieldEl) {
        // Specific field found — focus it directly if it matches, otherwise search within
        if (fieldEl.matches(FOCUS_SELECTOR)) {
          fieldEl.focus()
        } else {
          const focusable = fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR)
          focusable?.focus()
        }
      } else if (fallbackEl) {
        // Field element not found — focus the first top-level field in the row
        focusTopLevelField(fallbackEl)
      }
    }, 300)
  }, delay + 100)
}

/**
 * If the target element isn't in the current tab, cycle through inactive tabs
 * until it appears, then call the callback.
 */
function ensureTabAndRun(targetId: string, callback: () => void) {
  if (document.getElementById(targetId)) {
    callback()
    return
  }

  const tabs = Array.from(document.querySelectorAll<HTMLElement>('.tabs-field__tab-button'))
  const inactive = tabs.filter((t) => !t.classList.contains('tabs-field__tab-button--active'))

  let i = 0
  function tryNext() {
    if (i >= inactive.length) return
    inactive[i++]!.click()
    setTimeout(() => {
      if (document.getElementById(targetId)) {
        callback()
      } else {
        tryNext()
      }
    }, 400)
  }

  tryNext()
}

export default function VisualEditingBridge() {
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.data?.type !== 've:open-field') return

      const { fieldPath } = event.data as { fieldPath: string }
      const { rowIds, fieldId } = parseFieldPath(fieldPath)

      const probeId = rowIds[0] ?? fieldId
      if (!probeId) return

      ensureTabAndRun(probeId, () => expandAndFocus(rowIds, fieldId))
    }

    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [])

  return null
}
