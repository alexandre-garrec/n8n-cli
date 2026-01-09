import { promises as fs } from "fs";
import path from "path";
import fg from "fast-glob";
import { createN8nClient } from "../api/client.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { withSpinner, createSpinner } from "../utils/spinner.js";
import { zipJsonFiles } from "../utils/zip.js";

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function asArrayData(resp) {
  return resp?.data?.data || resp?.data || [];
}

export async function exportWorkflows(opts) {
  const client = await createN8nClient(opts.global);

  const out = String(opts.out || "./exports");
  const clean = opts.clean !== false;
  const all = !!opts.all;
  const bundle = !!opts.bundle;

  await ensureDir(out);

  const list = await withSpinner("Loading workflows…", async () => {
    const res = await client.get("/workflows");
    return asArrayData(res);
  }, "Loaded");

  const chosen = all ? list : list; // (UI selection is handled in ui.js; CLI export can be extended)

  const files = [];
  for (const w of chosen) {
    const { data: full } = await client.get(`/workflows/${w.id}`);
    const wf = clean ? cleanWorkflow(full) : full;
    const fileName = `${w.id}.json`;
    const filePath = path.join(out, fileName);
    await fs.writeFile(filePath, JSON.stringify(wf, null, 2), "utf-8");
    files.push({ name: fileName, path: filePath });
  }

  if (bundle) {
    const zipPath = path.join(out, "bundle.zip");
    const spin = createSpinner("Creating bundle.zip…").start();
    try {
      await zipJsonFiles(zipPath, files.map(f => ({ name: f.name, path: f.path })));
      spin.succeed(`bundle.zip created: ${zipPath}`);
    } catch (e) {
      spin.fail("bundle.zip failed");
      console.error(e?.message || e);
    }
  }

  console.log(`\n✅ Exported ${files.length} workflow(s) to: ${out}\n`);
}
