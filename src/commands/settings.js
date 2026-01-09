import inquirer from "inquirer";
import chalk from "chalk";
import { readConfig, updateConfig, getConfigPath } from "../config/store.js";
import { resolveCredentials } from "../auth/resolve.js";
import { createSpinner } from "../utils/spinner.js";
import { createN8nClient } from "../api/client.js";

export async function settingsMenu({ global }) {
  const cfg = await readConfig();
  const resolved = await resolveCredentials(global);

  console.log(chalk.gray("\nConfig file: ") + chalk.cyan(getConfigPath()));
  console.log(chalk.gray("Active source: ") + chalk.cyan(resolved.source));
  console.log(chalk.gray("URL: ") + chalk.cyan(resolved.url || "(not set)"));
  console.log(chalk.gray("API Key: ") + chalk.cyan(resolved.key ? "********" : "(not set)"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Settings",
      choices: [
        { name: "🔐 Configure n8n credentials", value: "creds" },
        { name: "🧪 Test connection", value: "test" },
        { name: "🧹 Clear saved credentials", value: "clear" },
        { name: "⬅ Back", value: "back" },
      ],
    },
  ]);

  if (action === "back") return;

  if (action === "creds") {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "n8n API base URL (ex: http://localhost:5678/api/v1):",
        default: cfg.url || resolved.url || "",
        validate: (v) => (String(v || "").trim() ? true : "Required"),
      },
      {
        type: "password",
        name: "key",
        message: "n8n API key:",
        mask: "*",
        default: cfg.key || resolved.key || "",
        validate: (v) => (String(v || "").trim() ? true : "Required"),
      },
    ]);

    await updateConfig({ url: answers.url.trim(), key: answers.key.trim() });
    console.log(chalk.green("\n✅ Credentials saved."));
    return;
  }

  if (action === "clear") {
    await updateConfig({ url: "", key: "" });
    console.log(chalk.green("\n✅ Saved credentials cleared."));
    return;
  }

  if (action === "test") {
    const spin = createSpinner("Testing n8n API…").start();
    try {
      const client = await createN8nClient(global);
      const { data } = await client.get("/workflows");
      const n = Array.isArray(data?.data) ? data.data.length : null;
      spin.succeed(n === null ? "Connected ✅" : `Connected ✅ (workflows: ${n})`);
    } catch (e) {
      spin.fail("Connection failed");
      console.log(e?.response?.data || e.message);
    }
  }
}
