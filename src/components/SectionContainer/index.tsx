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
      const targetOrigin = new URL(adminBaseUrl).origin
      window.parent.postMessage(
        { type: 've:open-field', fieldPath: basePath, docId, collectionSlug },
        targetOrigin,
      )
    } else {
      window.open(`${adminBaseUrl}/collections/${collectionSlug}/${docId}`, '_blank')
    }
  }

  return (
    <SectionContext.Provider value={{ basePath }}>
      {ctx?.isAdmin ? (
        <div
          data-testid="section-wrapper"
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
