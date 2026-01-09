import inquirer from "inquirer";
import chalk from "chalk";
import { readConfig, writeConfig, ensureProfile, getConfigPath } from "../config/store.js";
import { getResolvedCreds, createN8nClient } from "../api/client.js";
import { createSpinner } from "../utils/spinner.js";

export async function settingsMenu({ global }) {
  const cfg = await readConfig();
  const creds = await getResolvedCreds(global);

  console.log(chalk.gray("\nConfig file: ") + chalk.cyan(getConfigPath()));
  console.log(chalk.gray("Active profile: ") + chalk.cyan(creds.profile));
  console.log(chalk.gray("Active source: ") + chalk.cyan(creds.source));
  console.log(chalk.gray("URL: ") + chalk.cyan(creds.url || "(not set)"));
  console.log(chalk.gray("API Key: ") + chalk.cyan(creds.key ? "********" : "(not set)"));
  console.log(chalk.gray("UI Base URL: ") + chalk.cyan(creds.uiBaseUrl || "(optional)"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Settings",
      choices: [
        { name: "🧾 Switch profile", value: "switch" },
        { name: "➕ Create profile", value: "create" },
        { name: "🔐 Configure credentials (for active profile)", value: "creds" },
        { name: "🌐 Configure UI Base URL (for 'Open in browser')", value: "ui" },
        { name: "🧪 Test connection", value: "test" },
        { name: "🧹 Clear credentials (active profile)", value: "clear" },
        { name: "⬅ Back", value: "back" },
      ],
    },
  ]);

  if (action === "back") return;

  if (action === "switch") {
    const cfg2 = await readConfig();
    const profiles = Object.keys(cfg2.profiles || {});
    const { p } = await inquirer.prompt([
      { type: "list", name: "p", message: "Select active profile", choices: profiles.length ? profiles : ["default"] },
    ]);
    cfg2.activeProfile = p;
    await writeConfig(cfg2);
    console.log(chalk.green("\n✅ Active profile updated."));
    return;
  }

  if (action === "create") {
    const { p } = await inquirer.prompt([
      { type: "input", name: "p", message: "New profile name:", default: "staging" },
    ]);
    await ensureProfile(String(p || "default").trim());
    const cfg2 = await readConfig();
    cfg2.activeProfile = String(p || "default").trim();
    await writeConfig(cfg2);
    console.log(chalk.green("\n✅ Profile created & selected."));
    return;
  }

  if (action === "creds") {
    const cfg2 = await readConfig();
    const p = cfg2.activeProfile || "default";
    const current = cfg2.profiles?.[p] || {};
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "n8n API base URL (ex: http://localhost:5678/api/v1):",
        default: current.url || "",
        validate: (v) => (String(v || "").trim() ? true : "Required"),
      },
      {
        type: "password",
        name: "key",
        message: "n8n API key:",
        mask: "*",
        default: current.key || "",
        validate: (v) => (String(v || "").trim() ? true : "Required"),
      },
    ]);

    cfg2.profiles[p] = { ...current, url: answers.url.trim(), key: answers.key.trim() };
    await writeConfig(cfg2);
    console.log(chalk.green("\n✅ Credentials saved for profile: ") + chalk.cyan(p));
    return;
  }

  if (action === "ui") {
    const cfg2 = await readConfig();
    const p = cfg2.activeProfile || "default";
    const current = cfg2.profiles?.[p] || {};
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "uiBaseUrl",
        message: "UI Base URL (ex: http://localhost:5678):",
        default: current.uiBaseUrl || "",
      },
    ]);
    cfg2.profiles[p] = { ...current, uiBaseUrl: answers.uiBaseUrl.trim() };
    await writeConfig(cfg2);
    console.log(chalk.green("\n✅ UI Base URL saved."));
    return;
  }

  if (action === "clear") {
    const cfg2 = await readConfig();
    const p = cfg2.activeProfile || "default";
    const current = cfg2.profiles?.[p] || {};
    cfg2.profiles[p] = { ...current, url: "", key: "" };
    await writeConfig(cfg2);
    console.log(chalk.green("\n✅ Cleared credentials for profile: ") + chalk.cyan(p));
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
