'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'

type Props = {
  blockIndex: number
  blockType: string
  children: React.ReactNode
  className?: string
}

export const EditableBlock: React.FC<Props> = ({ blockIndex, blockType, children, className }) => {
  const ctx = useVisualEditing()
  const [hovered, setHovered] = useState(false)

  if (!ctx?.isAdmin) {
    return <div className={className}>{children}</div>
  }

  const { adminBaseUrl, collectionSlug, docId } = ctx
  const fieldPath = `layout.${blockIndex}`

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.parent !== window) {
      window.parent.postMessage({ type: 've:open-field', fieldPath, docId, collectionSlug }, '*')
    } else {
      window.open(`${adminBaseUrl}/collections/${collectionSlug}/${docId}`, '_blank')
    }
  }

  return (
    <div
      className={cn(
        'relative rounded transition-all duration-150',
        hovered && 'ring-2 ring-purple-400 ring-offset-4',
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <button
          className="absolute -top-3 left-4 z-50 flex items-center gap-1 rounded bg-purple-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-purple-600 cursor-pointer border-0"
          onClick={handleClick}
        >
          ✏ {blockType}
        </button>
      )}
      {children}
    </div>
  )
}
