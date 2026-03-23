'use client'

import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useVisualEditing } from '@/providers/VisualEditing'
import { useSectionContext } from '@/providers/SectionContext'

type Props = {
  field: string
  label?: string
  children: React.ReactNode
  className?: string
}

export const EditableField: React.FC<Props> = ({ field, label, children, className }) => {
  const ctx = useVisualEditing()
  const section = useSectionContext()
  const [hovered, setHovered] = useState(false)

  if (!ctx?.isAdmin) return <>{children}</>

  const { adminBaseUrl, collectionSlug, docId } = ctx
  const fieldPath = section?.basePath ? `${section.basePath}.${field}` : field

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.parent !== window) {
      const targetOrigin = new URL(adminBaseUrl).origin
      window.parent.postMessage({ type: 've:open-field', fieldPath, docId, collectionSlug }, targetOrigin)
    } else {
      window.open(`${adminBaseUrl}/collections/${collectionSlug}/${docId}`, '_blank')
    }
  }

  return (
    <div
      className={cn('relative cursor-pointer', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div
        className={cn(
          'transition-all duration-100',
          hovered && 'outline outline-1 outline-emerald-400',
        )}
      >
        {children}
      </div>
      {hovered && (
        <button
          className="absolute top-0 right-0 -translate-y-full z-50 flex items-center gap-1 bg-emerald-400 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-950 hover:bg-emerald-300 cursor-pointer border-0 whitespace-nowrap"
          onClick={handleClick}
        >
          {label ?? field}
        </button>
      )}
    </div>
  )
}
