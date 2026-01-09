# cli-n8n packaging notes

## Credentials

Users can configure credentials in the interactive menu: Settings → Configure n8n credentials.
They are saved in the OS user config directory (via env-paths).

Env vars also work:

- N8N_URL
- N8N_API_KEY

CLI flags override everything:

- --url
- --key

## Recommended package.json fields (ESM)

- "type": "module"
- "bin": { "cli-n8n": "./bin/index.js" }
- Add "files": ["bin", "src"]
- Ensure bin/index.js has: #!/usr/bin/env node
- Dependencies: commander, inquirer, chalk, ora, axios, env-paths

## Test locally like a package

- npm pack
- npm i -g ./n8n-cli-<version>.tgz
- n8n-cli
