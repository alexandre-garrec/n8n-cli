# cli-n8n ⚡️

A powerful, interactive CLI to manage and test **n8n workflows** directly from your terminal.

<img width="551" height="246" alt="CLI Screenshot" src="https://github.com/user-attachments/assets/7e7575e5-5e14-44c5-9f36-74d29f17ed80" />

## ✨ Features

- **✅ Interactive UI**: Manage workflows using a fast, menu-driven interface.
- **🪝 Webhook Invocation**: Test webhooks with a powerful **Tree View Editor**, auto-detection, and history.
- **💾 Local Versioning**: Save timestamped checkpoints of your workflows locally.
- **⭐ Favorites**: Pin your most-used workflows for quick access.
- **🔐 Profiles**: Manage multiple instances (Prod/Staging/Local) with isolated credentials.
- **📦 Import/Export**: Robust handling of files, URLs, and `bundle.zip` backups.

## 📦 Install

```bash
npm i -g cli-n8n
```

## 🚀 Quick Start

1.  **Run the CLI**:
    ```bash
    cli-n8n
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

## 🛠 Commands

| Command                         | Description                           |
| :------------------------------ | :------------------------------------ |
| `cli-n8n`                       | Launch interactive mode (Recommended) |
| `cli-n8n list`                  | List workflows                        |
| `cli-n8n list --search "foo"`   | Search workflows                      |
| `cli-n8n export --all --bundle` | Backup all workflows to a zip         |
| `cli-n8n import ./file.json`    | Import workflow                       |
| `cli-n8n delete <id>`           | Delete workflow (auto-backed up)      |

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
