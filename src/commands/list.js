import chalk from "chalk";
import { createN8nClient } from "../api/client.js";
import { withSpinner } from "../utils/spinner.js";

function asArrayData(resp) {
  return resp?.data?.data || resp?.data || [];
}

export async function listWorkflows(opts) {
  const client = await createN8nClient(opts.global);

  const list = await withSpinner("Loading workflows…", async () => {
    const res = await client.get("/workflows");
    return asArrayData(res);
  }, "Loaded");

  const q = opts.search ? String(opts.search).toLowerCase() : "";
  const filtered = q ? list.filter(w => String(w.name || "").toLowerCase().includes(q)) : list;
  const limited = Number.isFinite(opts.limit) ? filtered.slice(0, opts.limit) : filtered;

  if (opts.global.json) {
    console.log(JSON.stringify(limited, null, 2));
    return;
  }

  console.log(chalk.cyan(`\n${limited.length} workflow(s)\n`));
  for (const w of limited) {
    console.log(`- #${w.id}  ${w.name} ${w.active ? chalk.green("(active)") : chalk.gray("(inactive)")}`);
  }
}
