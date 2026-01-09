#!/usr/bin/env node
import { Command } from "commander";

// dotenv optional (dev only)
try {
  const dotenv = await import("dotenv");
  dotenv.default.config();
} catch {}

import { listWorkflows } from "../src/commands/list.js";
import { deleteWorkflows } from "../src/commands/delete.js";
import { exportWorkflows } from "../src/commands/export.js";
import { importWorkflows } from "../src/commands/import.js";
import { uiWorkflows } from "../src/commands/ui.js";
import { editWorkflow } from "../src/commands/edit.js";
import { interactiveMenu } from "../src/commands/menu.js";
import { shareWorkflow } from "../src/commands/share.js";

const program = new Command();

program
  .name("n8n-cli")
  .description("CLI to manage n8n workflows (local + interactive menu)")
  .version("0.1.0")
  .showHelpAfterError(true)
  .showSuggestionAfterError(true);

program
  .option("--url <url>", "Override base URL (ex: http://localhost:5678/api/v1)")
  .option("--key <key>", "Override API key")
  .option("--json", "JSON output (when applicable)", false);

program
  .command("list")
  .description("List workflows")
  .option("--search <q>", "Filter by name (contains)")
  .option("--limit <n>", "Limit results", (v) => parseInt(v, 10))
  .action(async (opts) => {
    await listWorkflows({ global: program.opts(), ...opts });
  });

program
  .command("delete")
  .description("Delete workflows")
  .argument("[id]", "Workflow ID to delete")
  .option("--name <name>", "Delete by EXACT name")
  .option("--search <q>", "Delete all workflows whose name contains <q>")
  .option("--dry-run", "Do not delete, only show what would be deleted", false)
  .action(async (id, opts) => {
    await deleteWorkflows({ global: program.opts(), id, ...opts });
  });

program
  .command("export")
  .description("Export workflows to JSON")
  .argument("[id]", "Workflow ID to export")
  .option("--all", "Export all workflows", false)
  .option("-o, --out <path>", "Output file or folder", "./exports")
  .option("--clean", "Clean workflow (minimal) before export", true)
  .action(async (id, opts) => {
    await exportWorkflows({ global: program.opts(), id, ...opts });
  });

program
  .command("import")
  .description("Import a workflow (file / URL)")
  .argument("<pathOrUrl>", "JSON file path or URL (https://...)")
  .option("--clean", "Clean before import", true)
  .option("--name <name>", "Override workflow name before POST")
  .action(async (pathOrUrl, opts) => {
    await importWorkflows({ global: program.opts(), pathOrUrl, ...opts });
  });

program
  .command("edit")
  .description("Edit a workflow (rename / activate) via API")
  .argument("<id>", "Workflow ID")
  .option("--name <name>", "New name")
  .option("--active <bool>", "Activate/deactivate (true/false)")
  .action(async (id, opts) => {
    await editWorkflow({ global: program.opts(), id, ...opts });
  });

program
  .command("ui")
  .description("Interactive workflows list + actions (delete/edit/export/share)")
  .option("--search <q>", "Filter by name (contains)")
  .action(async (opts) => {
    await uiWorkflows({ global: program.opts(), ...opts });
  });

program
  .command("share")
  .description("Share a workflow JSON (local server + optional Cloudflare tunnel)")
  .argument("<id>", "Workflow ID")
  .option("--port <n>", "HTTP port (default: 3333)", "3333")
  .option("--public", "Bind on 0.0.0.0 (LAN/VPN)", false)
  .option("--clean", "Clean workflow before sharing", true)
  .option("--tunnel <type>", "none | cloudflare", "cloudflare")
  .option("--cloudflared <path>", "Path to cloudflared (if not in PATH)")
  .action(async (id, opts) => {
    await shareWorkflow({ global: program.opts(), id, ...opts });
  });

program
  .command("menu")
  .description("Interactive main menu (default)")
  .action(async () => {
    await interactiveMenu({ global: program.opts() });
  });

program.on("command:*", () => {
  console.error(`❌ Unknown command: ${program.args.join(" ")}`);
  program.help({ error: true });
});

const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0) {
  interactiveMenu({ global: program.opts() }).catch((err) => {
    console.error("❌ Error:", err?.response?.data || err.message || err);
    process.exit(1);
  });
} else {
  program.parseAsync(process.argv).catch((err) => {
    console.error("❌ Error:", err?.response?.data || err.message || err);
    process.exit(1);
  });
}
