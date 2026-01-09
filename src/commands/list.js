import { createN8nClient } from "../api/client.js";
import { withSpinner } from "../utils/spinner.js";

export async function listWorkflows(opts) {
  const client = await createN8nClient({ url: opts.global.url, key: opts.global.key });

  const workflows = await withSpinner("Chargement des workflows…", async () => {
    const { data } = await client.get("/workflows");
    return data?.data || data || [];
  }, "Workflows chargés");

  const q = (opts.search || "").toLowerCase().trim();
  let filtered = workflows;

  if (q) filtered = workflows.filter((w) => String(w.name || "").toLowerCase().includes(q));
  if (opts.limit && Number.isFinite(opts.limit)) filtered = filtered.slice(0, opts.limit);

  if (opts.global.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log(`📄 ${filtered.length} workflow(s)`);
  for (const w of filtered) {
    console.log(`- ${w.id}  ${w.active ? "🟢" : "⚪️"}  ${w.name}`);
  }
}
