import { createN8nClient } from "../api/client.js";
import { createSpinner, withSpinner } from "../utils/spinner.js";

export async function deleteWorkflows(opts) {
  const client = await createN8nClient({ url: opts.global.url, key: opts.global.key });

  const workflows = await withSpinner("Chargement des workflows…", async () => {
    const { data } = await client.get("/workflows");
    return data?.data || data || [];
  }, "Workflows chargés");

  const id = opts.id ? String(opts.id) : null;
  const name = opts.name ? String(opts.name) : null;
  const search = opts.search ? String(opts.search).toLowerCase() : null;

  let targets = [];
  if (id) targets = workflows.filter((w) => String(w.id) === id);
  else if (name) targets = workflows.filter((w) => String(w.name) === name);
  else if (search) targets = workflows.filter((w) => String(w.name || "").toLowerCase().includes(search));
  else throw new Error("Spécifie un id, ou --name, ou --search.");

  if (!targets.length) {
    console.log("🤷 Aucun workflow trouvé.");
    return;
  }

  console.log(`🧨 Cible(s): ${targets.length}`);
  for (const w of targets) console.log(`- ${w.id} ${w.name}`);

  if (opts.dryRun) {
    console.log("✅ dry-run: aucune suppression effectuée.");
    return;
  }

  for (const w of targets) {
    const s = createSpinner(`Suppression: ${w.name}`).start();
    try {
      await client.delete(`/workflows/${w.id}`);
      s.succeed(`Supprimé: ${w.name}`);
    } catch (err) {
      s.fail(`Erreur suppression: ${w.name}`);
      console.error(err?.response?.data || err.message);
    }
  }
}
