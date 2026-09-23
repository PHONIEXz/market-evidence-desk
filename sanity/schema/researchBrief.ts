import {defineField, defineType} from 'sanity'

export const researchBrief = defineType({
  name: 'researchBrief', title: 'Research brief', type: 'document',
  fields: [
    defineField({name: 'event', type: 'reference', to: [{type: 'marketEvent'}], validation: rule => rule.required()}),
    defineField({name: 'claims', type: 'array', of: [{type: 'reference', to: [{type: 'evidenceClaim'}]}]}),
    defineField({name: 'body', type: 'text', validation: rule => rule.required()}),
    defineField({name: 'decision', type: 'string', initialValue: 'pending', options: {list: ['pending', 'approved', 'rejected']}}),
    defineField({name: 'reviewedBy', type: 'string'}),
    defineField({name: 'reviewedAt', type: 'datetime'}),
  ],
})
