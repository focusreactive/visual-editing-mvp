'use client'

import React, { Fragment } from 'react'

import type { Props } from './types'

import { ImageMedia } from './ImageMedia'
import { VideoMedia } from './VideoMedia'
import { EditableField } from '@/components/EditableField'
import { useVisualEditing } from '@/providers/VisualEditing'
import { useSectionContext } from '@/providers/SectionContext'

export const Media: React.FC<Props> = (props) => {
  const { className, htmlElement = 'div', resource } = props
  const ve = useVisualEditing()
  const section = useSectionContext()

  const isVideo = typeof resource === 'object' && resource?.mimeType?.includes('video')
  const Tag = htmlElement || Fragment

  const tagProps = htmlElement !== null ? { className } : {}

  if (section?.basePath && ve?.isAdmin) {
    return (
      <EditableField field="media" label="media">
        <Tag {...tagProps}>
          {isVideo ? <VideoMedia {...props} /> : <ImageMedia {...props} />}
        </Tag>
      </EditableField>
    )
  }

  return (
    <Tag {...tagProps}>
      {isVideo ? <VideoMedia {...props} /> : <ImageMedia {...props} />}
    </Tag>
  )
}
