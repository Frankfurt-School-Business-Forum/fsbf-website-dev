import {defineField, defineType} from 'sanity'

export const speaker = defineType({
  name: 'speaker',
  title: 'Speaker',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required().custom((v) => Boolean(v?.trim()) || 'Enter a name.')}),
    defineField({name: 'role', type: 'string', validation: (r) => r.required().custom((v) => Boolean(v?.trim()) || 'Enter a role.')}),
    defineField({name: 'companyName', type: 'string', validation: (r) => r.required().custom((v) => Boolean(v?.trim()) || 'Enter a company name.')}),
    defineField({name: 'portrait', type: 'image', validation: (r) => r.required().assetRequired()}),
    defineField({name: 'portraitAlt', title: 'Portrait alt text', type: 'string', validation: (r) => r.required().custom((v) => Boolean(v?.trim()) || 'Describe the portrait.')}),
    defineField({name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url', validation: (r) => r.uri({scheme: ['https']}).custom((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        return (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))) || 'Use an HTTPS LinkedIn URL.'
      } catch { return 'Use a valid LinkedIn URL.' }
    })}),
    defineField({name: 'companyLogo', type: 'image'}),
    defineField({name: 'badgeText', type: 'string', description: 'Shown when no company logo is supplied.'}),
    defineField({name: 'sortOrder', type: 'number', initialValue: 0, validation: (r) => r.required().integer().min(0)}),
    defineField({name: 'visible', type: 'boolean', initialValue: true, validation: (r) => r.required()}),
  ],
  orderings: [{title: 'Website order', name: 'websiteOrder', by: [{field: 'sortOrder', direction: 'asc'}, {field: 'name', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'companyName', media: 'portrait'}},
})
