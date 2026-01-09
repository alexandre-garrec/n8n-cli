import { createN8nClient } from "../api/client.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";

/**
 * Édition "simple" via API:
 * - rename
 * - active true/false
 *
 * n8n API: GET /workflows/:id puis PUT /workflows/:id
 */
export async function editWorkflow(opts) {
  const client = await createN8nClient({ url: opts.global.url, key: opts.global.key });

  const id = String(opts.id);
  const { data: current } = await client.get(`/workflows/${id}`);

  // On part d'un workflow "importable"
  const base = cleanWorkflow(current);

  let active = current.active;
  if (typeof opts.active === "string") {
    const v = opts.active.toLowerCase().trim();
    active = v === "true" || v === "1" || v === "yes" || v === "y";
  } else if (typeof opts.active === "boolean") {
    active = opts.active;
  }

  const payload = {
    ...base,
    name: (opts.name ? String(opts.name).trim() : base.name) || base.name,
    // Certains n8n acceptent active dans PUT, d'autres via endpoint dédié.
    // On l'envoie quand même; si ton n8n refuse, tu pourras gérer avec un endpoint "activate".
    active,
  };

  try {
    const { data: updated } = await client.put(`/workflows/${id}`, payload);
    console.log(`✅ Workflow mis à jour: ${updated?.name ?? payload.name} (#${id})`);
  } catch (err) {
    // fallback: si active plante, on retente sans active
    const msg = err?.response?.data || err.message;
    console.error("⚠️  PUT avec 'active' a échoué, retry sans 'active'...");
    console.error(msg);

    const retryPayload = { ...payload };
    delete retryPayload.active;

    const { data: updated2 } = await client.put(`/workflows/${id}`, retryPayload);
    console.log(`✅ Workflow mis à jour (sans active): ${updated2?.name ?? retryPayload.name} (#${id})`);
    console.log("ℹ️  Si tu veux gérer active proprement, on peut ajouter un endpoint dédié selon ta version n8n.");
  }
}
