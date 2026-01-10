# cli-n8n ⚡️

A powerful, interactive CLI to manage and test **n8n workflows** directly from your terminal.

![render1767985696782-min](https://github.com/user-attachments/assets/c1efd063-f454-4cf3-a632-376bd45fdd6c)

## ✨ Features

- **✅ Interactive UI**: Manage workflows using a fast, menu-driven interface.
- **🪝 Webhook Invocation**: Test webhooks with a powerful **Tree View Editor**, auto-detection, and history.
- **💾 Local Versioning**: Save timestamped checkpoints of your workflows locally.
- **⭐ Favorites**: Pin your most-used workflows for quick access.
- **🔐 Profiles**: Manage multiple instances (Prod/Staging/Local) with isolated credentials.
- **📦 Import/Export**: Robust handling of files, URLs, and `bundle.zip` backups.

## 📦 Install

### Global Installation (Recommended)

```bash
npm i -g cli-n8n
```

### Or use with npx (No installation required)

```bash
npx cli-n8n
```

## 🚀 Quick Start

1.  **Run the CLI**:

    With global install:

    ```bash
    cli-n8n
    ```

    Or with npx:

    ```bash
    npx cli-n8n
    ```

2.  **Configure**: Go to **Settings → Configure credentials** to connect your n8n instance.

## 📖 Usage Guide

### 🪝 Webhook Testing

Invoke webhooks interactively without leaving the terminal.

- **Tree Editor**: Edit complex JSON payloads in a visual tree structure (nesting supported!).
- **Auto-Detect**: The CLI inspects your workflow to guess required fields.
- **History**: It remembers your last payload for every workflow.
- **Retry**: Rapidly tweak and resend requests from the result screen.

### 💾 Local Versioning

Never lose work again. Save snapshots to your machine.

- **Save**: Select "Save local version" in the menu.
- **List**: View all saved versions in `./versions/{WorkflowName}/`.

### ⚡️ Workflow Management

- **List**: Browse workflows with status icons.
- **Filter**: Search by name or ID.
- **Favorites**: Highlight important workflows (displayed with ⭐).

### 📤 Workflow Sharing

Share workflows instantly via HTTP server with optional public access through Cloudflare tunnel.

#### Local Sharing

Share a workflow on your local network:

```bash
cli-n8n share <workflow-id>
```

This starts a local HTTP server (default port: 3333) and provides:

- **Local URL**: Access from your machine (`http://127.0.0.1:3333/workflow.json`)
- **Network URL**: Access from devices on the same network
- **Auto-copy**: URL automatically copied to clipboard

Options:

- `--port <number>`: Custom port (default: 3333)
- `--public`: Bind to `0.0.0.0` for network access
- `--clean=false`: Include credentials (default: cleaned)

#### Public Sharing with Cloudflare

Share workflows publicly using Cloudflare tunnel (requires [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)):

```bash
cli-n8n share <workflow-id> --tunnel cloudflare
```

This creates a temporary public URL via `trycloudflare.com`:

- ✅ No Cloudflare account required
- ✅ Instant public HTTPS link
- ✅ Perfect for sharing with teammates
- ⚠️ Link expires when you stop the server (CTRL+C)

Install cloudflared:

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 📥 Workflow Import

Import workflows from multiple sources:

#### From Local File

```bash
cli-n8n import ./workflow.json
```

#### From URL

Import directly from a shared link (perfect with `share` command!):

```bash
cli-n8n import https://example.trycloudflare.com/123.json
```

The CLI automatically:

- Downloads the JSON with retry logic
- Handles DNS resolution delays
- Validates the workflow structure

#### From Bundle (ZIP)

Import multiple workflows from a backup bundle:

```bash
cli-n8n import ./bundle.zip
```

#### Import Options

- `--name "Custom Name"`: Override workflow name
- `--upsert`: Update existing workflow with same name (auto-backup before overwrite)
- `--clean=false`: Keep credentials (default: cleaned)
- `--dry-run`: Preview what would be imported without making changes

## 🛠 Commands

| Command                                  | Description                           |
| :--------------------------------------- | :------------------------------------ |
| `cli-n8n`                                | Launch interactive mode (Recommended) |
| `cli-n8n list`                           | List workflows                        |
| `cli-n8n list --search "foo"`            | Search workflows                      |
| `cli-n8n share <id>`                     | Share workflow locally                |
| `cli-n8n share <id> --tunnel cloudflare` | Share workflow publicly (Cloudflare)  |
| `cli-n8n import ./file.json`             | Import from local file                |
| `cli-n8n import <url>`                   | Import from URL                       |
| `cli-n8n import ./bundle.zip`            | Import from bundle                    |
| `cli-n8n import <url> --upsert`          | Import and update if exists           |
| `cli-n8n export --all --bundle`          | Backup all workflows to a zip         |
| `cli-n8n delete <id>`                    | Delete workflow (auto-backed up)      |

## ⚙️ Configuration

### Profiles

Switch between environments easily:

```bash
cli-n8n --profile staging
```

Or manage them in **Settings**.

### Environment Variables

Optionally configure via ENV (overrides saved config):

```bash
export N8N_URL="http://localhost:5678/api/v1"
export N8N_API_KEY="YOUR_KEY"
```

## License

MIT
