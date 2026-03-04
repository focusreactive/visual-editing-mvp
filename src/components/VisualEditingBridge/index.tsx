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
      // fieldPath examples:
      //   'layout.0.richText'       → block field
      //   'layout.0.links.0'        → nested array item inside block
      const parts = fieldPath.split('.')
      const fieldRoot = parts[0]!
      const blockIndex = parts.length > 1 ? parseInt(parts[1]!, 10) : null

      // Nested array item: layout.{blockIdx}.{arrayField}.{arrayIdx}
      const isNestedArrayItem = parts.length === 4 && !isNaN(parseInt(parts[3]!, 10))
      const nestedArrayField = isNestedArrayItem ? parts[2]! : null
      const nestedArrayIndex = isNestedArrayItem ? parseInt(parts[3]!, 10) : null

      const blockRowId = blockIndex !== null ? `${fieldRoot}-row-${blockIndex}` : null
      // For nested array items, target the row; for plain fields, target the field element
      const nestedRowId =
        nestedArrayField !== null && blockIndex !== null && nestedArrayIndex !== null
          ? `${fieldRoot}__${blockIndex}__${nestedArrayField}-row-${nestedArrayIndex}`
          : null
      const fieldId =
        !isNestedArrayItem && parts.length > 2
          ? `field-${fieldPath.replace(/\./g, '__')}`
          : null

      // Step 1: switch to correct tab if needed
      const tabLabel = FIELD_TAB_MAP[fieldRoot]
      if (tabLabel) {
        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))
        const inactiveTarget = tabs.find(
          (t) => t.textContent?.trim() === tabLabel && t.getAttribute('aria-selected') !== 'true',
        )
        if (inactiveTarget) inactiveTarget.click()
      }

      console.debug('[ve:bridge]', { fieldPath, blockRowId, nestedRowId, fieldId })

      // Step 2: wait for tab switch animation, then expand block + scroll
      setTimeout(() => {
        if (blockRowId) {
          const blockRow = document.getElementById(blockRowId)
          const toggle = blockRow?.querySelector<HTMLButtonElement>('.collapsible__toggle')
          if (toggle?.classList.contains('collapsible__toggle--collapsed')) toggle.click()
        }

        // Step 3: wait for block expand, then expand nested array row + scroll
        setTimeout(() => {
          if (nestedRowId) {
            const nestedRow = document.getElementById(nestedRowId)
            const nestedToggle = nestedRow?.querySelector<HTMLButtonElement>('.collapsible__toggle')
            if (nestedToggle?.classList.contains('collapsible__toggle--collapsed')) nestedToggle.click()
          }

          const targetId = nestedRowId ?? fieldId ?? blockRowId
          if (!targetId) return
          const el = document.getElementById(targetId)
          console.debug('[ve:bridge] target el', targetId, el)
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
