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
  .description("CLI to manage n8n workflows (interactive + commands)")
  .version("0.1.0")
  .showHelpAfterError(true)
  .showSuggestionAfterError(true);

program
  .option(
    "--url <url>",
    "Override API base URL (ex: http://localhost:5678/api/v1)"
  )
  .option("--key <key>", "Override API key")
  .option("--profile <name>", "Profile name (Settings profiles)", "")
  .option("--json", "JSON output (when applicable)", false);

program
  .command("menu")
  .description("Interactive main menu (default)")
  .action(async () => interactiveMenu({ global: program.opts() }));

program
  .command("list")
  .description("List workflows")
  .option("--search <q>", "Filter by name (contains)")
  .option("--limit <n>", "Limit results", (v) => parseInt(v, 10))
  .action(async (opts) => listWorkflows({ global: program.opts(), ...opts }));

program
  .command("export")
  .description("Export workflows (supports bundle.zip)")
  .option("--all", "Export all workflows", true)
  .option("--bundle", "Create bundle.zip", true)
  .option("-o, --out <path>", "Output folder", "./exports")
  .option("--clean", "Clean before export", true)
  .action(async (opts) => exportWorkflows({ global: program.opts(), ...opts }));

program
  .command("import")
  .description("Import a workflow (file/URL/bundle.zip)")
  .argument("<pathOrUrl>", "JSON file, URL, or bundle.zip")
  .option("--name <name>", "Override workflow name before import")
  .option("--upsert", "Update if workflow with same name exists", true)
  .option("--dry-run", "Do not create/update", false)
  .option("--clean", "Clean before import", true)
  .action(async (pathOrUrl, opts) =>
    importWorkflows({ global: program.opts(), pathOrUrl, ...opts })
  );

program
  .command("delete")
  .description("Delete workflows (backup first)")
  .argument("[id]", "Workflow ID")
  .option("--name <name>", "Delete by exact name")
  .option("--search <q>", "Delete by name contains")
  .option("--dry-run", "Do not delete", false)
  .action(async (id, opts) =>
    deleteWorkflows({ global: program.opts(), id, ...opts })
  );

program
  .command("edit")
  .description("Edit workflow (backup first)")
  .argument("<id>", "Workflow ID")
  .option("--name <name>", "New name")
  .option("--active <bool>", "true/false")
  .option("--dry-run", "Do not update", false);
//.action(async (id, opts) => editWorkflow({ global: program.opts(), id, ...opts }));

program
  .command("ui")
  .description("Interactive workflows list + actions")
  .option("--search <q>", "Filter by name (contains)")
  .option("--recent", "Show recent workflows", false)
  .action(async (opts) => uiWorkflows({ global: program.opts(), ...opts }));

program
  .command("share")
  .description("Share workflow JSON (local + Cloudflare tunnel)")
  .argument("<id>", "Workflow ID")
  .option("--port <n>", "HTTP port", "3333")
  .option("--public", "Bind on 0.0.0.0", false)
  .option("--clean", "Clean before share", true)
  .option("--tunnel <type>", "none | cloudflare", "cloudflare")
  .option("--cloudflared <path>", "Path to cloudflared", "")
  .action(async (id, opts) =>
    shareWorkflow({ global: program.opts(), id, ...opts })
  );

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
