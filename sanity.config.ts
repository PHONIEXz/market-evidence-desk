import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './sanity/schema'

// The project ID is public metadata. API tokens belong in local environment variables.
export default defineConfig({
  name: 'market-evidence-desk',
  title: 'Market Evidence Desk',
  projectId: 'cxjysvlq',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
