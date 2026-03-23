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
            'relative transition-all duration-100',
            hovered && 'outline outline-1 outline-emerald-400',
            className,
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={handleClick}
        >
          {hovered && blockType && (
            <button
              className="absolute top-0 right-0 -translate-y-full z-50 flex items-center gap-1 bg-emerald-400 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-950 hover:bg-emerald-300 cursor-pointer border-0"
              onClick={handleClick}
            >
              {blockType}
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
