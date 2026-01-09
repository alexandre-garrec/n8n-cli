import inquirer from "inquirer";
import chalk from "chalk";

export async function pickWorkflow(workflows, { message = "Select a workflow" } = {}) {
  if (!workflows.length) return null;

  const choices = workflows.map((w) => ({
    name: `${w.active ? chalk.green("●") : chalk.gray("○")} ${chalk.cyan(w.name)} ${chalk.gray(`(#${w.id})`)}`,
    value: w.id,
    short: `${w.name} (#${w.id})`,
  }));

  const { id } = await inquirer.prompt([
    {
      type: "list",
      name: "id",
      message,
      pageSize: Math.min(15, choices.length),
      choices,
    },
  ]);

  return workflows.find((w) => String(w.id) === String(id)) || null;
}

export async function pickActionAfterSelect() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Workflow actions",
      choices: [
        { name: "✏️  Edit (rename / active)", value: "edit" },
        { name: "📤 Export JSON", value: "export" },
        { name: "🔗 Share (local + Cloudflare)", value: "share" },
        { name: "🗑️  Delete", value: "delete" },
        new inquirer.Separator(),
        { name: "↩️ Back to list", value: "back" },
        { name: "🚪 Exit", value: "quit" },
      ],
    },
  ]);
  return action;
}

export async function confirm(message, def = false) {
  const { ok } = await inquirer.prompt([
    { type: "confirm", name: "ok", message, default: def },
  ]);
  return ok;
}

export async function askEditDefaults(workflow) {
  const { name, active } = workflow;
  const answers = await inquirer.prompt([
    { type: "input", name: "newName", message: "New name", default: name },
    { type: "confirm", name: "newActive", message: "Active?", default: !!active },
  ]);

  return {
    name: (answers.newName ?? "").trim() || name,
    active: !!answers.newActive,
  };
}
