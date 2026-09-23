import {defineField, defineType} from 'sanity'

export const evidenceClaim = defineType({
  name: 'evidenceClaim', title: 'Evidence claim', type: 'document',
  fields: [
    defineField({name: 'event', type: 'reference', to: [{type: 'marketEvent'}], validation: rule => rule.required()}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: rule => rule.required()}),
    defineField({name: 'text', type: 'text', validation: rule => rule.required()}),
    defineField({name: 'stance', type: 'string', options: {list: ['supports', 'conflicts', 'context']}, validation: rule => rule.required()}),
    defineField({name: 'observedAt', type: 'datetime', validation: rule => rule.required()}),
    defineField({name: 'expiresAt', type: 'datetime'}),
  ],
})
