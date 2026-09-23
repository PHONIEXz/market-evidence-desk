import {defineField, defineType} from 'sanity'

export const source = defineType({
  name: 'source', title: 'Source', type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: rule => rule.required()}),
    defineField({name: 'url', type: 'url', validation: rule => rule.required().uri({scheme: ['https']})}),
    defineField({name: 'publishedAt', type: 'datetime', validation: rule => rule.required()}),
    defineField({name: 'kind', type: 'string', options: {list: ['official', 'commentary', 'data']}, validation: rule => rule.required()}),
    defineField({name: 'notes', type: 'text'}),
  ],
})
