import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'cxjysvlq', dataset: 'production'},
  deployment: {appId: 'esqg5fnnr6jg2b67vtzfnczq'},
  server: {hostname: 'localhost', port: 3333},
})
