'use client'

import React from 'react'

import type { CardGridBlock as CardGridBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import { CMSLink } from '@/components/Link'
import { useSectionContext } from '@/providers/SectionContext'
import { SectionContainer } from '@/components/SectionContainer'

export const CardGridBlock: React.FC<CardGridBlockProps> = ({ title, cards }) => {
  const section = useSectionContext()

  return (
    <div className="container">
      {title && <h2 className="text-2xl font-bold mb-8">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards &&
          cards.map((card, index) => {
            const { media, text, link } = card
            const cardBasePath = section?.basePath
              ? `${section.basePath}.cards.${index}`
              : undefined

            const cardContent = (
              <div className="bg-card rounded border border-border overflow-hidden flex flex-col">
                {media && (
                  <Media
                    imgClassName="w-full aspect-video object-cover"
                    resource={media}
                  />
                )}
                <div className="p-4 flex flex-col gap-3">
                  {text && <p>{text}</p>}
                  {link && <CMSLink {...link} />}
                </div>
              </div>
            )

            return cardBasePath ? (
              <SectionContainer key={index} basePath={cardBasePath}>
                {cardContent}
              </SectionContainer>
            ) : (
              <div key={index}>{cardContent}</div>
            )
          })}
      </div>
    </div>
  )
}
