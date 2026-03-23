'use client'

import React from 'react'

import type { ImageTextBlock as ImageTextBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { Media } from '@/components/Media'
import { CMSLink } from '@/components/Link'

export const ImageTextBlock: React.FC<ImageTextBlockProps> = ({ richText, media, link }) => {
  return (
    <div className="container">
      <div className="flex flex-col gap-8">
        {richText && <RichText data={richText} enableGutter={false} />}
        {media && (
          <Media
            imgClassName="border border-border rounded-[0.8rem] w-full"
            resource={media}
          />
        )}
        {link && <CMSLink {...link} />}
      </div>
    </div>
  )
}
