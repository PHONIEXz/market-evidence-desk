import {defineField, defineType} from 'sanity'

export const marketEvent = defineType({
  name: 'marketEvent', title: 'Research question', type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: rule => rule.required()}),
    defineField({name: 'summary', type: 'text'}),
    defineField({name: 'observedAt', type: 'datetime', validation: rule => rule.required()}),
    defineField({name: 'review', type: 'string', initialValue: 'needs-human-review', options: {list: ['needs-human-review', 'approved', 'rejected']}, validation: rule => rule.required()}),
  ],
})
