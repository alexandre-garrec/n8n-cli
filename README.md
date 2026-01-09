# n8n-cli

A fast CLI to manage **n8n workflows** from your terminal.

## Features

- ✅ Interactive menu (default)
- ✅ Profiles (default/staging/prod) with per-profile credentials
- ✅ Settings menu (persisted config via `env-paths`)
- ✅ List, export, import, delete, edit
- ✅ Import from **file / URL / bundle.zip**
- ✅ `--upsert` by name (update if exists) + **automatic backups**
- ✅ Automatic backups before delete/update
- ✅ Export `bundle.zip`
- ✅ Kiff features:
  - Copy workflow ID/name/share URL to clipboard
  - Open workflow in browser (set UI Base URL in Settings)
  - Recent workflows view
  - Previews/summaries in the UI

## Install

```bash
npm i -g n8n-cli
n8n-cli
```

## Setup (recommended)

Run:

```bash
n8n-cli
```

Go to: **Settings → Configure credentials**

### Profiles

- Create/switch profiles in **Settings**
- Or use CLI: `--profile staging`

## Environment variables (optional)

```bash
export N8N_URL="http://localhost:5678/api/v1"
export N8N_API_KEY="YOUR_KEY"
```

Priority: **flags → env → saved config**

## Commands

List:

```bash
n8n-cli list
n8n-cli list --search "invoice"
```

Export (bundle.zip):

```bash
n8n-cli export --all --bundle -o ./exports
```

Import (URL/file/bundle.zip):

```bash
n8n-cli import ./workflow.json
n8n-cli import https://example.com/workflow.json
n8n-cli import ./exports/bundle.zip
```

Import upsert by name:

```bash
n8n-cli import https://example.com/workflow.json --upsert
```

Delete (backup first):

```bash
n8n-cli delete 123
```

Edit (backup first):

```bash
n8n-cli edit 123 --name "New name"
n8n-cli edit 123 --active true
```

Share:

```bash
n8n-cli share 123
```

> Sharing starts a local server and can launch a Cloudflare quick tunnel (requires `cloudflared` installed).

## Notes

- Requires Node.js **18+**
- Some networks/DNS filters may block `trycloudflare.com` (VPN/corporate DNS/adblock DNS)

## License

MIT (change if you prefer)
