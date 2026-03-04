import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { EditableField } from '@/components/EditableField'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="container">
      <div className="bg-card rounded border-border border p-4 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div className="max-w-[48rem] flex items-center">
          <EditableField field="richText" label="Rich Text">
            {richText && <RichText className="mb-0" data={richText} enableGutter={false} />}
          </EditableField>
        </div>
        <div className="flex flex-col gap-8">
          {(links || []).map(({ link }, i) => (
            <EditableField key={i} field={`links.${i}`} label={link.label || `Link ${i + 1}`}>
              <CMSLink size="lg" {...link} />
            </EditableField>
          ))}
        </div>
      </div>
    </div>
  )
}
