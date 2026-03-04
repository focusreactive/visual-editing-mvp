'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'

type Props = {
  field: string
  label?: string
  blockIndex: number
  children: React.ReactNode
  className?: string
}

export const EditableField: React.FC<Props> = ({
  field,
  label,
  blockIndex,
  children,
  className,
}) => {
  const ctx = useVisualEditing()
  const [hovered, setHovered] = useState(false)

  if (!ctx?.isAdmin) return <>{children}</>

  const { adminBaseUrl, collectionSlug, docId } = ctx
  const fieldPath = `layout.${blockIndex}.${field}`

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
      className={cn('relative', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <button
          className="absolute -top-5 right-0 z-50 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 cursor-pointer border-0 whitespace-nowrap"
          onClick={handleClick}
        >
          ✏ {label ?? field}
        </button>
      )}
      <div
        className={cn(
          'rounded transition-all duration-150',
          hovered && 'ring-2 ring-blue-500 ring-offset-2',
        )}
      >
        {children}
      </div>
    </div>
  )
}
