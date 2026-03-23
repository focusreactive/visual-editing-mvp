'use client'

import { useEffect } from 'react'

const FOCUS_SELECTOR =
  '[data-lexical-editor="true"], input:not([type="hidden"]), textarea'

const SWEEP_STYLE_ID = 've-sweep-styles'

function ensureSweepStyles() {
  if (document.getElementById(SWEEP_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = SWEEP_STYLE_ID
  style.textContent = `
    @keyframes ve-sweep {
      0%   { transform: translateY(-100%); opacity: 1; }
      60%  { opacity: 1; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    .ve-sweep-container {
      position: relative;
      overflow: hidden;
    }
    .ve-sweep-overlay {
      pointer-events: none;
      position: absolute;
      inset: 0;
      z-index: 40;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(52, 211, 153, 0.08) 30%,
        rgba(52, 211, 153, 0.15) 50%,
        rgba(52, 211, 153, 0.08) 70%,
        transparent 100%
      );
      animation: ve-sweep 0.6s ease-out forwards;
    }
  `
  document.head.appendChild(style)
}

function playSweep(el: HTMLElement) {
  ensureSweepStyles()
  el.classList.add('ve-sweep-container')

  const overlay = document.createElement('div')
  overlay.className = 've-sweep-overlay'
  el.appendChild(overlay)

  overlay.addEventListener('animationend', () => {
    overlay.remove()
    el.classList.remove('ve-sweep-container')
  })
}

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
 * Returns the focused field-type element (for sweep), or null.
 */
function focusTopLevelField(container: HTMLElement): HTMLElement | null {
  const renderFields = container.querySelector('.render-fields')
  if (!renderFields) return null
  for (const child of renderFields.children) {
    if (!child.classList.contains('field-type')) continue
    const focusable = child.querySelector<HTMLElement>(FOCUS_SELECTOR)
    if (focusable) {
      focusable.focus()
      return child as HTMLElement
    }
  }
  return null
}

/**
 * Sequentially uncollapse all rows, then scroll to the target and focus.
 */
function expandAndFocus(rowIds: string[], fieldId: string | null) {
  let delay = 0
  const EXPAND_DELAY = 500 // must comfortably exceed Payload's 300ms collapse transition

  for (const rowId of rowIds) {
    setTimeout(() => {
      const row = document.getElementById(rowId)
      const toggle = row?.querySelector<HTMLButtonElement>('.collapsible__toggle')
      if (toggle?.classList.contains('collapsible__toggle--collapsed')) toggle.click()
    }, delay)
    delay += EXPAND_DELAY
  }

  // Wait for all expansions to settle, then scroll and focus
  setTimeout(() => {
    const fieldEl = fieldId ? document.getElementById(fieldId) : null
    const fallbackEl = rowIds.length
      ? document.getElementById(rowIds[rowIds.length - 1]!)
      : null
    const scrollTarget = fieldEl ?? fallbackEl
    if (!scrollTarget) return

    const bounds = scrollTarget.getBoundingClientRect()
    window.scrollBy({ behavior: 'smooth', top: bounds.top - 200 })

    // Focus and sweep only the final target field
    setTimeout(() => {
      let sweepTarget: HTMLElement | null = null

      if (fieldEl) {
        if (fieldEl.matches(FOCUS_SELECTOR)) {
          fieldEl.focus()
          sweepTarget = fieldEl.closest<HTMLElement>('.field-type')
        } else {
          const focusable = fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR)
          focusable?.focus()
          sweepTarget = fieldEl
        }
      } else if (fallbackEl) {
        sweepTarget = focusTopLevelField(fallbackEl)
      }

      if (sweepTarget) playSweep(sweepTarget)
    }, 400)
  }, delay + 200)
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
