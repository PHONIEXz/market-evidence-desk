import {defineField, defineType} from 'sanity'

export const evidenceClaim = defineType({
  name: 'evidenceClaim', title: 'Evidence claim', type: 'document',
  description: 'A linked paraphrase. A source check is an editor attestation, not an automatic audit.',
  validation: rule => rule.custom((claim) => {
    const fields = claim as Record<string, unknown> | undefined
    if (fields?.reviewStatus !== 'source-checked') return true
    const required = ['sourceExcerpt', 'sourceLocator', 'reviewerName', 'reviewedAt'] as const
    if (required.some(field => typeof fields[field] !== 'string' || !(fields[field] as string).trim())) {
      return 'A source check needs an exact short passage, its location, a public reviewer name, and the review date.'
    }
    const reviewedAt = Date.parse(fields.reviewedAt as string)
    const observedAt = Date.parse(fields.observedAt as string)
    if (!Number.isFinite(reviewedAt) || !Number.isFinite(observedAt) || reviewedAt < observedAt) {
      return 'The review date must be on or after the claim observation date.'
    }
    return true
  }),
  fields: [
    defineField({name: 'event', type: 'reference', to: [{type: 'marketEvent'}], validation: rule => rule.required()}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: rule => rule.required()}),
    defineField({name: 'text', type: 'text', validation: rule => rule.required()}),
    defineField({name: 'stance', type: 'string', options: {list: ['supports', 'conflicts', 'context']}, validation: rule => rule.required()}),
    defineField({name: 'observedAt', type: 'datetime', validation: rule => rule.required()}),
    defineField({name: 'expiresAt', type: 'datetime'}),
    defineField({name: 'sourceExcerpt', title: 'Exact source passage', type: 'text', rows: 3,
      description: 'Copy only a short, exact passage from the linked original. Leave blank if you have not checked it.',
      validation: rule => rule.max(280)}),
    defineField({name: 'sourceLocator', title: 'Passage location', type: 'string',
      description: 'Section heading, paragraph, page number, or stable fragment where a reader can find the passage.',
      validation: rule => rule.max(160)}),
    defineField({name: 'reviewStatus', title: 'Source check', type: 'string', initialValue: 'needs-review',
      options: {list: ['needs-review', 'source-checked']},
      description: 'Choose source-checked only after personally matching the claim and passage to the original publication.'}),
    defineField({name: 'reviewerName', title: 'Public reviewer name', type: 'string',
      description: 'Published attribution. Enter your own name only after you have reviewed the original passage.',
      validation: rule => rule.max(100)}),
    defineField({name: 'reviewedAt', title: 'Source checked at', type: 'datetime',
      description: 'When the named editor performed the source check.'}),
  ],
})
