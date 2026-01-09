import chalk from "chalk";
import { createN8nClient } from "../api/client.js";
import { createSpinner } from "../utils/spinner.js";
import { backupWorkflowJson } from "../utils/backup.js";

export async function editWorkflow(opts) {
  const client = await createN8nClient(opts.global);

  const id = String(opts.id || "").trim();
  if (!id) throw new Error("Missing workflow id");

  const dryRun = !!opts.dryRun;

  const { data: wf } = await client.get(`/workflows/${id}`);
  const backupPath = await backupWorkflowJson({ id, name: wf?.name, json: wf });

  const patch = {};
  if (opts.name) patch.name = String(opts.name);
  if (opts.active !== undefined) patch.active = String(opts.active) === "true";

  if (!Object.keys(patch).length) {
    console.log(chalk.yellow("Nothing to edit. Provide --name or --active true/false"));
    return;
  }

  if (dryRun) {
    console.log(`🟡 DRY-RUN: would UPDATE #${id} (backup: ${backupPath})`);
    console.log(patch);
    return;
  }

  const spin = createSpinner(`Updating #${id}…`).start();
  try {
    await client.put(`/workflows/${id}`, { ...wf, ...patch });
    spin.succeed(`Updated #${id} — backup saved`);
  } catch (e) {
    spin.fail("Update failed");
    console.error(e?.response?.data || e.message);
  }
}
