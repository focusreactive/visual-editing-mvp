'use client'

import { useEffect } from 'react'

// Maps field root paths to their tab labels in the Pages collection
const FIELD_TAB_MAP: Record<string, string> = {
  layout: 'Content',
  hero: 'Hero',
  meta: 'SEO',
}

export default function VisualEditingFocuser() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const focusPath = params.get('focusPath')
    if (!focusPath) return

    const parts = focusPath.split('.')
    const fieldRoot = parts[0]!
    const blockIndex = parts.length > 1 ? parseInt(parts[1] ?? '0', 10) : null
    const hasField = parts.length > 2

    const blockRowId = blockIndex !== null ? `${fieldRoot}-row-${blockIndex}` : null
    const fieldId = hasField ? `field-${focusPath.replace(/\./g, '__')}` : null

    const execute = (retries = 0) => {
      // Step 1: Switch to the correct tab if not already active
      const tabLabel = FIELD_TAB_MAP[fieldRoot]
      if (tabLabel) {
        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))
        const targetTab = tabs.find(
          (tab) =>
            tab.textContent?.trim() === tabLabel && tab.getAttribute('aria-selected') !== 'true',
        )
        if (targetTab) {
          targetTab.click()
          if (retries < 10) setTimeout(() => execute(retries + 1), 400)
          return
        }
      }

      // Step 2: Find and expand the block
      if (blockRowId) {
        const blockRow = document.getElementById(blockRowId)
        if (!blockRow) {
          if (retries < 10) setTimeout(() => execute(retries + 1), 300)
          return
        }
        const toggle = blockRow.querySelector<HTMLButtonElement>('.collapsible__toggle')
        if (toggle?.classList.contains('collapsible__toggle--collapsed')) {
          toggle.click()
        }
      }

      // Step 3: Scroll to field (or block row)
      setTimeout(() => {
        const targetId = fieldId ?? blockRowId
        if (!targetId) return
        const el = document.getElementById(targetId)
        if (el) {
          const bounds = el.getBoundingClientRect()
          window.scrollBy({ behavior: 'smooth', top: bounds.top - 100 })
        }
      }, 350)
    }

    setTimeout(execute, 500)
  }, [])

  return null
}
