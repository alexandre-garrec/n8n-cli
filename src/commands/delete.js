import chalk from "chalk";
import { createN8nClient } from "../api/client.js";
import { withSpinner, createSpinner } from "../utils/spinner.js";
import { backupWorkflowJson } from "../utils/backup.js";

function asArrayData(resp) {
  return resp?.data?.data || resp?.data || [];
}

export async function deleteWorkflows(opts) {
  const client = await createN8nClient(opts.global);

  const id = opts.id ? String(opts.id).trim() : "";
  const dryRun = !!opts.dryRun;

  const list = await withSpinner("Loading workflows…", async () => {
    const res = await client.get("/workflows");
    return asArrayData(res);
  }, "Loaded");

  let targets = [];

  if (id) {
    const t = list.find((w) => String(w.id) === id);
    if (t) targets = [t];
  } else if (opts.name) {
    targets = list.filter((w) => String(w.name || "") === String(opts.name));
  } else if (opts.search) {
    const q = String(opts.search).toLowerCase();
    targets = list.filter((w) => String(w.name || "").toLowerCase().includes(q));
  } else {
    console.log(chalk.yellow("Nothing to delete. Provide id OR --name OR --search."));
    return;
  }

  if (!targets.length) {
    console.log(chalk.yellow("No matching workflows."));
    return;
  }

  for (const w of targets) {
    const { data: full } = await client.get(`/workflows/${w.id}`);
    const backupPath = await backupWorkflowJson({ id: w.id, name: full?.name, json: full });

    if (dryRun) {
      console.log(`🟡 DRY-RUN: would DELETE #${w.id} "${w.name}" (backup: ${backupPath})`);
      continue;
    }

    const spin = createSpinner(`Deleting #${w.id} "${w.name}"…`).start();
    try {
      await client.delete(`/workflows/${w.id}`);
      spin.succeed(`Deleted #${w.id} — backup saved`);
    } catch (e) {
      spin.fail("Delete failed");
      console.error(e?.response?.data || e.message);
    }
  }
}
