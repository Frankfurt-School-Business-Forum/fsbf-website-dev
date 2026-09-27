import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'FSBF CMS',

  projectId: 'm3oobx03',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) => S.list().title('Content').items([
        S.listItem().id('eventSettings').title('Event Settings').child(
          S.document().schemaType('eventSettings').documentId('eventSettings'),
        ),
        ...S.documentTypeListItems().filter((item) => item.getId() !== 'eventSettings'),
      ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => template.schemaType !== 'eventSettings'),
  },
  document: {
    actions: (actions, context) => context.schemaType === 'eventSettings'
      ? actions.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
      : actions,
  },
})
