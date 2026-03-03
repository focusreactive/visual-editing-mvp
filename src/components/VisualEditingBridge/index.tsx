'use client'

import { useEffect } from 'react'

const FIELD_TAB_MAP: Record<string, string> = {
  layout: 'Content',
  hero: 'Hero',
  meta: 'SEO',
}

export default function VisualEditingBridge() {
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.data?.type !== 've:open-field') return

      const { fieldPath } = event.data as { fieldPath: string }
      const parts = fieldPath.split('.')
      const fieldRoot = parts[0]!
      const blockIndex = parts.length > 1 ? parseInt(parts[1]!, 10) : null
      const hasField = parts.length > 2

      const blockRowId = blockIndex !== null ? `${fieldRoot}-row-${blockIndex}` : null
      const fieldId = hasField ? `field-${fieldPath.replace(/\./g, '__')}` : null

      // Step 1: switch to correct tab if needed
      const tabLabel = FIELD_TAB_MAP[fieldRoot]
      if (tabLabel) {
        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))
        const inactiveTarget = tabs.find(
          (t) => t.textContent?.trim() === tabLabel && t.getAttribute('aria-selected') !== 'true',
        )
        if (inactiveTarget) inactiveTarget.click()
      }

      // Step 2: wait for tab switch animation, then expand block + scroll
      setTimeout(() => {
        if (blockRowId) {
          const blockRow = document.getElementById(blockRowId)
          const toggle = blockRow?.querySelector<HTMLButtonElement>('.collapsible__toggle')
          if (toggle?.classList.contains('collapsible__toggle--collapsed')) toggle.click()
        }

        // Step 3: wait for expand animation, then scroll to field
        setTimeout(() => {
          const targetId = fieldId ?? blockRowId
          if (!targetId) return
          const el = document.getElementById(targetId)
          if (el) {
            const bounds = el.getBoundingClientRect()
            window.scrollBy({ behavior: 'smooth', top: bounds.top - 100 })
          }
        }, 300)
      }, 200)
    }

    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [])

  return null
}
