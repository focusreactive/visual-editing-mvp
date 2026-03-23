import type { Block, Field } from 'payload'

import { link } from '@/fields/link'

const cardFields: Field[] = [
  {
    name: 'media',
    type: 'upload',
    relationTo: 'media',
    required: true,
  },
  {
    name: 'text',
    type: 'text',
    required: true,
  },
  link({
    appearances: false,
  }),
]

export const CardGrid: Block = {
  slug: 'cardGrid',
  interfaceName: 'CardGridBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'cards',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: cardFields,
      minRows: 1,
    },
  ],
  labels: {
    singular: 'Card Grid',
    plural: 'Card Grids',
  },
}
