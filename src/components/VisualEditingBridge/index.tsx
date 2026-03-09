'use client'

import { useEffect } from 'react'

function expandAndScroll(blockRowId: string | null, nestedRowId: string | null, fieldId: string | null) {
  if (blockRowId) {
    const blockRow = document.getElementById(blockRowId)
    const toggle = blockRow?.querySelector<HTMLButtonElement>('.collapsible__toggle')
    if (toggle?.classList.contains('collapsible__toggle--collapsed')) toggle.click()
  }

  setTimeout(() => {
    if (nestedRowId) {
      const nestedRow = document.getElementById(nestedRowId)
      const nestedToggle = nestedRow?.querySelector<HTMLButtonElement>('.collapsible__toggle')
      if (nestedToggle?.classList.contains('collapsible__toggle--collapsed')) nestedToggle.click()
    }

    const targetId = nestedRowId ?? fieldId ?? blockRowId
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (el) {
      const bounds = el.getBoundingClientRect()
      window.scrollBy({ behavior: 'smooth', top: bounds.top - 100 })
    }
  }, 400)
}

/**
 * If the target element isn't in the current tab, cycle through inactive tabs
 * until it appears, then call the callback. Works regardless of tab labels or structure.
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
      // fieldPath examples:
      //   'layout.0.richText'   → block field
      //   'layout.0.links.0'    → nested array item inside block
      const parts = fieldPath.split('.')
      const fieldRoot = parts[0]!
      const blockIndex = parts.length > 1 ? parseInt(parts[1]!, 10) : null

      const isNestedArrayItem = parts.length === 4 && !isNaN(parseInt(parts[3]!, 10))
      const nestedArrayField = isNestedArrayItem ? parts[2]! : null
      const nestedArrayIndex = isNestedArrayItem ? parseInt(parts[3]!, 10) : null

      const blockRowId = blockIndex !== null ? `${fieldRoot}-row-${blockIndex}` : null
      // Payload array row IDs use dashes: layout-0-links-row-0
      const nestedRowId =
        nestedArrayField !== null && blockIndex !== null && nestedArrayIndex !== null
          ? `${fieldRoot}-${blockIndex}-${nestedArrayField}-row-${nestedArrayIndex}`
          : null
      const fieldId =
        !isNestedArrayItem && parts.length > 2
          ? `field-${fieldPath.replace(/\./g, '__')}`
          : null

      // Use blockRowId as the probe — if it's not in the DOM, we're on the wrong tab
      const probeId = blockRowId ?? fieldId
      if (!probeId) return

      ensureTabAndRun(probeId, () => expandAndScroll(blockRowId, nestedRowId, fieldId))
    }

    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [])

  return null
}
