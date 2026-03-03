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
  const href = `${adminBaseUrl}/collections/${collectionSlug}/${docId}?focusPath=layout.${blockIndex}.${field}`

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-1 right-1 z-50 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600"
          onClick={(e) => e.stopPropagation()}
        >
          ✏ {label ?? field}
        </a>
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
