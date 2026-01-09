import inquirer from "inquirer";
import chalk from "chalk";
import { uiWorkflows } from "./ui.js";
import { importWorkflows, getWorkflowNameFromSource } from "./import.js";
import { exportWorkflows } from "./export.js";
import { settingsMenu } from "./settings.js";

function header() {
  console.clear();
  console.log(chalk.cyan.bold("n8n-cli"));
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
        pageSize: 10,
        choices: [
          { name: "📄 Workflows (interactive list)", value: "workflows" },
          { name: "📥 Import workflow (file/URL)", value: "import" },
          { name: "📦 Export all workflows", value: "exportAll" },
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

    if (action === "import") {
      const { pathOrUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "pathOrUrl",
          message: "JSON file path or URL:",
          validate: (v) => (String(v || "").trim() ? true : "Required"),
        },
      ]);

      // default = name inside JSON (download/read)
      const detectedName = await getWorkflowNameFromSource({ global: opts.global, pathOrUrl });

      const { name } = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Workflow name:",
          default: detectedName || "Imported workflow",
        },
      ]);

      await importWorkflows({ global: opts.global, pathOrUrl, clean: true, name: String(name || "").trim() });
      continue;
    }

    if (action === "exportAll") {
      const { out } = await inquirer.prompt([
        { type: "input", name: "out", message: "Output folder:", default: "./exports" },
      ]);
      await exportWorkflows({ global: opts.global, all: true, out, clean: true });
      continue;
    }
  }
}
