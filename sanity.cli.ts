import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'cxjysvlq', dataset: 'production'},
  server: {hostname: 'localhost', port: 3333},
})
