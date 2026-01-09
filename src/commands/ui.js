import inquirer from "inquirer";
import chalk from "chalk";
import open from "open";
import { createN8nClient, getResolvedCreds } from "../api/client.js";
import { createSpinner, withSpinner } from "../utils/spinner.js";
import { exportWorkflows } from "./export.js";
import { deleteWorkflows } from "./delete.js";
import { editWorkflow } from "./edit.js";
import { shareWorkflow } from "./share.js";
import { saveWorkflowVersion, listWorkflowVersions } from "./save.js";
import { invokeWorkflowWebhook } from "./invoke.js";
import { loadFavorites, toggleFavorite } from "../utils/favorites.js";
import { copy } from "../utils/clipboard.js";
import { deriveBaseUrl } from "../utils/urlHelper.js";

function asArrayData(resp) {
  return resp?.data?.data || resp?.data || [];
}

function short(w, favs = []) {
  const isFav = favs.includes(String(w.id));
  const str = `${w.active ? "🟢" : "⚫️"} ${w.name} #${w.id}`;
  return isFav ? chalk.yellow(str) : str;
}

export async function uiWorkflows(opts) {
  const client = await createN8nClient(opts.global);
  const creds = await getResolvedCreds(opts.global);
  const favs = await loadFavorites();

  const list = await withSpinner(
    "Loading workflows…",
    async () => {
      const res = await client.get("/workflows");
      return asArrayData(res);
    },
    "Loaded"
  );

  let workflows = list;

  // Sorting: favorites first, then by date if recent
  workflows = [...workflows].sort((a, b) => {
    const aFav = favs.includes(String(a.id));
    const bFav = favs.includes(String(b.id));
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    if (opts.recent) {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    }
    return 0; // standard order
  });

  if (opts.search) {
    const q = String(opts.search).toLowerCase();
    workflows = workflows.filter((w) =>
      String(w.name || "")
        .toLowerCase()
        .includes(q)
    );
  }

  if (!workflows.length) {
    console.log(chalk.yellow("No workflows."));
    return;
  }

  const { picked } = await inquirer.prompt([
    {
      type: "list",
      name: "picked",
      message: "Select a workflow",
      pageSize: 18,
      choices: workflows.map((w) => ({ name: short(w, favs), value: w })),
    },
  ]);

  const w = picked;

  // Preview / summary
  console.log(
    "\n" + chalk.cyan("Selected: ") + chalk.white(`#${w.id} ${w.name}`)
  );
  console.log(
    chalk.gray("Active: ") +
      (w.active ? chalk.green("true") : chalk.red("false"))
  );
  if (w.updatedAt)
    console.log(chalk.gray("Updated: ") + chalk.white(String(w.updatedAt)));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Action",
      choices: [
        { name: "🪝 Invoke Webhook", value: "invoke" },
        { name: "🌐 Open in browser", value: "open" },
        { name: "📦 Export this workflow", value: "export" },
        // { name: "✏️ Rename / Toggle active", value: "edit" },
        { name: "🗑️ Delete (with backup)", value: "delete" },
        { name: "🔗 Share (local + Cloudflare)", value: "share" },
        { name: "💾 Save local version", value: "save_version" },
        { name: "📂 List local versions", value: "list_versions" },
        { name: "⭐ Toggle favorite", value: "fav" },
        new inquirer.Separator(),
        { name: "⬅ Back", value: "back" },
      ],
    },
  ]);

  if (action === "back") return;

  if (action === "open") {
    // 1) Determine UI base url:
    // - prefer uiBaseUrl from Settings
    // - otherwise derive from API base url by stripping /api/v1 (or /api)
    let base = deriveBaseUrl(creds);

    if (!base) {
      console.log(
        chalk.yellow("UI Base URL not set and could not be derived.")
      );
      console.log(
        chalk.gray("Go to Settings → UI Base URL (e.g. http://localhost:5678)")
      );
      return;
    }

    base = base.replace(/\/+$/, "");

    // 2) Try multiple common n8n editor routes (varies by version/setup)
    const candidates = [
      `${base}/workflow/${w.id}`,
      `${base}/#/workflow/${w.id}`,
      `${base}/#/workflows/${w.id}`,
    ];

    const url = candidates[0];

    const spin = createSpinner("Opening in browser…").start();
    try {
      // Try opening first candidate; if it fails, still print candidates
      await open(url);
      spin.succeed("Opened");
      console.log(chalk.green("✅ Opened: ") + url);

      // Copy to clipboard as a fallback convenience
      const ok = await copy(url);
      if (ok) console.log(chalk.gray("📋 Copied to clipboard."));
    } catch (e) {
      spin.fail("Could not open browser automatically");
      console.log(chalk.yellow("Try opening manually:"));
      for (const u of candidates) console.log(" - " + u);

      // Copy best guess
      await copy(url);
      console.log(chalk.gray("📋 Best guess copied to clipboard."));
      console.log(chalk.gray("Details: ") + (e?.message || e));
    }

    return;
  }

  if (action === "edit") {
    const ans = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "New name (leave empty to keep):",
        default: w.name,
      },
      {
        type: "confirm",
        name: "toggle",
        message: "Toggle active?",
        default: false,
      },
      { type: "confirm", name: "dryRun", message: "Dry-run?", default: false },
    ]);
    await editWorkflow({
      global: opts.global,
      id: String(w.id),
      name: ans.name && ans.name.trim() ? ans.name.trim() : undefined,
      active: ans.toggle ? String(!w.active) : undefined,
      dryRun: ans.dryRun,
    });
    return;
  }

  if (action === "delete") {
    const ans = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Delete "${w.name}"?`,
        default: false,
      },
      { type: "confirm", name: "dryRun", message: "Dry-run?", default: false },
    ]);
    if (!ans.confirm) return;
    await deleteWorkflows({
      global: opts.global,
      id: String(w.id),
      dryRun: ans.dryRun,
    });
    return;
  }

  if (action === "share") {
    await shareWorkflow({
      global: opts.global,
      id: String(w.id),
      port: 3333,
      public: false,
      clean: true,
      tunnel: "cloudflare",
    });
    return;
  }

  if (action === "save_version") {
    const ans = await inquirer.prompt([
      {
        type: "input",
        name: "comment",
        message: "Version comment (optional):",
      },
    ]);

    await saveWorkflowVersion({
      global: opts.global,
      id: w.id,
      name: w.name,
      comment: ans.comment,
    });
    return;
  }

  if (action === "list_versions") {
    const list = await listWorkflowVersions(w.name);
    if (!list.length) {
      console.log(chalk.yellow("No local versions found."));
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message: "Select version:",
        choices: [
          ...list.map((f) => ({ name: f.name, value: f })),
          new inquirer.Separator(),
          { name: "⬅ Back", value: "back" },
        ],
      },
    ]);

    if (selected === "back") return;

    // For now, just show the path
    console.log(chalk.green("\nFile located at:"));
    console.log(chalk.white(selected.path));
    // TODO: Add ability to restore or diff
    return;
  }

  if (action === "invoke") {
    await invokeWorkflowWebhook({
      global: opts.global,
      id: w.id,
    });
    return;
  }

  if (action === "fav") {
    const isNowFav = await toggleFavorite(w.id);
    console.log(
      isNowFav
        ? chalk.yellow(`\n⭐ Added "${w.name}" to favorites.`)
        : chalk.white(`\nRemoved "${w.name}" from favorites.`)
    );
    return;
  }
}
