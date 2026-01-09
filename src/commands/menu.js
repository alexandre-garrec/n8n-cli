import inquirer from "inquirer";
import chalk from "chalk";
import { settingsMenu } from "./settings.js";
import { uiWorkflows } from "./ui.js";
import { exportWorkflows } from "./export.js";
import { importWorkflows, getWorkflowNameFromSource } from "./import.js";

function header() {
  console.clear();
  console.log(chalk.cyan.bold("cli-n8n"));
  console.log(chalk.gray("Manage n8n workflows from your terminal\n"));
}

export async function interactiveMenu(opts) {
  while (true) {
    header();

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Main Menu",
        pageSize: 12,
        choices: [
          { name: "📄 Workflows (interactive list)", value: "workflows" },
          { name: "📥 Import workflow (file/URL/zip)", value: "import" },
          { name: "📦 Export workflows (incl. bundle.zip)", value: "export" },
          { name: "🕘 Recent workflows", value: "recent" },
          { name: "⚙️ Settings", value: "settings" },
          new inquirer.Separator(),
          { name: chalk.gray("Exit"), value: "quit" },
        ],
      },
    ]);

    if (action === "quit") return;

    if (action === "settings") {
      await settingsMenu({ global: opts.global });
      continue;
    }

    if (action === "workflows") {
      await uiWorkflows({ global: opts.global });
      continue;
    }

    if (action === "recent") {
      await uiWorkflows({ global: opts.global, recent: true });
      continue;
    }

    if (action === "export") {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "all",
          message: "Export all workflows?",
          default: true,
        },
        {
          type: "confirm",
          name: "bundle",
          message: "Create bundle.zip?",
          default: true,
        },
        {
          type: "input",
          name: "out",
          message: "Output path/folder:",
          default: "./exports",
        },
        {
          type: "confirm",
          name: "clean",
          message: "Clean before export?",
          default: true,
        },
      ]);
      await exportWorkflows({ global: opts.global, ...answers });
      continue;
    }

    if (action === "import") {
      const { pathOrUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "pathOrUrl",
          message: "File path / URL / bundle.zip:",
          validate: (v) => (String(v || "").trim() ? true : "Required"),
        },
      ]);

      const detectedName = await getWorkflowNameFromSource({
        global: opts.global,
        pathOrUrl,
      });

      const { name } = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Workflow name:",
          default: detectedName || "Imported workflow",
        },
      ]);

      const { upsert } = await inquirer.prompt([
        {
          type: "confirm",
          name: "upsert",
          message: "Upsert by name (update if exists)?",
          default: true,
        },
      ]);

      await importWorkflows({
        global: opts.global,
        pathOrUrl,
        name: String(name || "").trim(),
        clean: true,
        upsert,
        dryRun: false,
      });
      continue;
    }
  }
}
