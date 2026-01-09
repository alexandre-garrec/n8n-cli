# n8n-cli

A small CLI to manage **n8n workflows** from your terminal.

- ✅ Interactive menu (recommended)
- ✅ List / export / import / delete / edit
- ✅ Share a workflow JSON locally + optional Cloudflare quick tunnel
- ✅ Works as a real npm package (no `.env` required)

---

## Installation

### Global install

```bash
npm i -g n8n-cli
n8n-cli
```

### Local dev

```bash
npm install
npm run dev
```

---

## Credentials

This CLI needs your **n8n API base URL** and **n8n API key**.

### Option 1 — Settings (best)

Run:

```bash
n8n-cli
```

Then go to:

**Settings → Configure n8n credentials**

Credentials are saved in your OS user config directory (via `env-paths`).

### Option 2 — Environment variables

```bash
export N8N_URL="http://localhost:5678/api/v1"
export N8N_API_KEY="YOUR_KEY"
n8n-cli
```

### Option 3 — CLI flags

```bash
n8n-cli --url "http://localhost:5678/api/v1" --key "YOUR_KEY"
```

**Priority:** flags → env vars → saved config.

---

## Usage

### Interactive mode (default)

```bash
n8n-cli
```

### Commands

List workflows:

```bash
n8n-cli list
n8n-cli list --search "invoice"
```

Export workflows:

```bash
n8n-cli export --all -o ./exports
n8n-cli export 123 -o ./exports
```

Import from file or URL:

```bash
n8n-cli import ./my-workflow.json
n8n-cli import https://example.com/workflow.json
```

Import with a custom name:

```bash
n8n-cli import https://example.com/workflow.json --name "My Imported Workflow"
```

Delete:

```bash
n8n-cli delete 123
n8n-cli delete --search "old"
```

Edit:

```bash
n8n-cli edit 123 --name "New name"
n8n-cli edit 123 --active true
```

Share a workflow:

```bash
n8n-cli share 123
```

> Sharing uses a local HTTP server and can optionally start a Cloudflare quick tunnel.  
> Some DNS filters / VPNs may block `trycloudflare.com`.

---

## Node version

- Node.js **18+**

---

## License

MIT (change if you prefer)
