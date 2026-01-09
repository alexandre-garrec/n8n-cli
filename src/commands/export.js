import path from "path";
import { createN8nClient } from "../api/client.js";
import { ensureDir, writeJson } from "../utils/io.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { createSpinner, withSpinner } from "../utils/spinner.js";

export async function exportWorkflows(opts) {
  const client = await createN8nClient({ url: opts.global.url, key: opts.global.key });

  const out = opts.out || "./exports";
  const isAll = !!opts.all;

  if (!isAll && !opts.id) throw new Error("Export: donne un id ou utilise --all.");

  if (isAll) {
    const workflows = await withSpinner("Chargement des workflows…", async () => {
      const { data } = await client.get("/workflows");
      return data?.data || data || [];
    }, "Workflows chargés");

    await ensureDir(out);

    console.log(`📦 Export de ${workflows.length} workflow(s) vers ${out}`);
    for (const w of workflows) {
      const s = createSpinner(`Export: ${w.name}`).start();
      try {
        const { data: full } = await client.get(`/workflows/${w.id}`);
        const wf = opts.clean ? cleanWorkflow(full) : full;
        const file = path.join(out, `${safeName(w.name)}__${w.id}.json`);
        await writeJson(file, wf);
        s.succeed(`${w.name} -> ${file}`);
      } catch (err) {
        s.fail(`Erreur export: ${w.name}`);
        console.error(err?.response?.data || err.message);
      }
    }
    return;
  }

  const wfFull = await withSpinner(`Chargement workflow #${opts.id}…`, async () => {
    const { data } = await client.get(`/workflows/${opts.id}`);
    return data;
  }, "Workflow chargé");

  const wf = opts.clean ? cleanWorkflow(wfFull) : wfFull;

  const filePath = out.toLowerCase().endsWith(".json")
    ? out
    : path.join(out, `${safeName(wf.name)}__${wf.id || opts.id}.json`);

  await writeJson(filePath, wf);
  console.log(`✅ Exporté: ${wf.name} -> ${filePath}`);
}

function safeName(name = "workflow") {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
