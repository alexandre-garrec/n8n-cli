# cli-n8n

A fast CLI to manage **n8n workflows** from your terminal.

<img width="551" height="246" alt="Capture d’écran 2026-01-09 à 04 05 19" src="https://github.com/user-attachments/assets/7e7575e5-5e14-44c5-9f36-74d29f17ed80" />

## Features

- ✅ Interactive menu (default)
- ✅ Profiles (default/staging/prod) with per-profile credentials
- ✅ Settings menu (persisted config via `env-paths`)
- ✅ List, export, import, delete, edit
- ✅ Import from **file / URL / bundle.zip**
- ✅ `--upsert` by name (update if exists) + **automatic backups**
- ✅ Automatic backups before delete/update
- ✅ Export `bundle.zip`

## Install

```bash
npm i -g cli-n8n
cli-n8n
```

## Setup (recommended)

Run:

```bash
cli-n8n
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
cli-n8n list
cli-n8n list --search "invoice"
```

Export (bundle.zip):

```bash
cli-n8n export --all --bundle -o ./exports
```

Import (URL/file/bundle.zip):

```bash
cli-n8n import ./workflow.json
cli-n8n import https://example.com/workflow.json
cli-n8n import ./exports/bundle.zip
```

Import upsert by name:

```bash
cli-n8n import https://example.com/workflow.json --upsert
```

Delete (backup first):

```bash
cli-n8n delete 123
```

Edit (backup first):

```bash
cli-n8n edit 123 --name "New name"
cli-n8n edit 123 --active true
```

Share:

```bash
cli-n8n share 123
```

> Sharing starts a local server and can launch a Cloudflare quick tunnel (requires `cloudflared` installed).

## Notes

- Requires Node.js **18+**
- Some networks/DNS filters may block `trycloudflare.com` (VPN/corporate DNS/adblock DNS)

## License

MIT (change if you prefer)
