'use client'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

import type { Page, Post } from '@/payload-types'
import { EditableField } from '@/components/EditableField'
import { useVisualEditing } from '@/providers/VisualEditing'
import { useSectionContext } from '@/providers/SectionContext'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  editField?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | null
  url?: string | null
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const {
    type,
    appearance = 'inline',
    children,
    className,
    editField,
    label,
    newTab,
    reference,
    size: sizeFromProps,
    url,
  } = props

  const ve = useVisualEditing()
  const section = useSectionContext()

  const href =
    type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
      ? `${reference?.relationTo !== 'pages' ? `/${reference?.relationTo}` : ''}/${
          reference.value.slug
        }`
      : url

  if (!href) return null

  const size = appearance === 'link' ? 'clear' : sizeFromProps
  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  const linkElement =
    /* Ensure we don't break any styles set by richText */
    appearance === 'inline' ? (
      <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
        {label && label}
        {children && children}
      </Link>
    ) : (
      <Button asChild className={className} size={size} variant={appearance}>
        <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
          {label && label}
          {children && children}
        </Link>
      </Button>
    )

  if (ve?.isAdmin && section?.basePath) {
    return (
      <EditableField field={editField ? `${editField}.label` : 'link.label'}>
        {linkElement}
      </EditableField>
    )
  }

  return linkElement
}
