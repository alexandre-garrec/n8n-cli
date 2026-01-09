import { promises as fs } from "fs";
import path from "path";
import axios from "axios";
import { lookup } from "dns/promises";
import fg from "fast-glob";
import { createSpinner, withSpinner } from "../utils/spinner.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { createN8nClient } from "../api/client.js";
import { backupWorkflowJson } from "../utils/backup.js";
import { unzipToTemp } from "../utils/zip.js";

function isUrl(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDns(host, { timeoutMs = 6000, intervalMs = 250 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await lookup(host);
      return true;
    } catch {}
    await sleep(intervalMs);
  }
  return false;
}

async function downloadJsonWithRetry(url) {
  const u = new URL(url);
  await waitForDns(u.hostname);

  const delays = [0, 250, 600, 1000, 1600, 2400, 3500, 5000];
  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      const res = await axios.get(url, { responseType: "text", timeout: 9000, validateStatus: () => true });
      if (res.status >= 200 && res.status < 300) {
        const txt = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        return JSON.parse(txt);
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
      if (e?.code === "ENOTFOUND") await waitForDns(u.hostname, { timeoutMs: 2500, intervalMs: 250 });
    }
  }
  throw lastErr || new Error("Failed to download JSON");
}

async function readJsonFile(fp) {
  return JSON.parse(await fs.readFile(fp, "utf-8"));
}

function looksZip(p) {
  return String(p || "").toLowerCase().endsWith(".zip");
}

export async function getWorkflowNameFromSource({ global, pathOrUrl }) {
  try {
    const src = String(pathOrUrl || "").trim();
    if (!src) return "";
    if (isUrl(src)) {
      const json = await downloadJsonWithRetry(src);
      return String(json?.name || "").trim();
    }
    if (looksZip(src)) return "";
    const json = await readJsonFile(src);
    return String(json?.name || "").trim();
  } catch {
    return "";
  }
}

async function findExistingByName(client, name) {
  const { data } = await client.get("/workflows");
  const list = data?.data || data || [];
  return list.find((w) => String(w.name || "").trim() === String(name || "").trim());
}

export async function importWorkflows(opts) {
  const client = await createN8nClient(opts.global);

  const src = String(opts.pathOrUrl || "").trim();
  if (!src) throw new Error("Import failed: pathOrUrl is required");

  const clean = opts.clean !== false;
  const upsert = !!opts.upsert;
  const dryRun = !!opts.dryRun;

  // Load items (single json, url json, or zip bundle)
  let items = [];
  if (isUrl(src)) {
    const raw = await withSpinner("Downloading workflow JSON…", () => downloadJsonWithRetry(src), "Downloaded");
    items = [raw];
  } else if (looksZip(src)) {
    const tmpDir = path.join(process.cwd(), ".tmp_n8ncli_import");
    await withSpinner("Extracting bundle.zip…", () => unzipToTemp(src, tmpDir), "Extracted");
    const files = await fg(["**/*.json"], { cwd: tmpDir, absolute: true });
    for (const f of files) items.push(await readJsonFile(f));
  } else {
    items = [await readJsonFile(src)];
  }

  for (const raw of items) {
    const nameFromJson = String(raw?.name || "").trim();
    const finalName = String(opts.name || "").trim() || nameFromJson || "Imported workflow";

    const wf0 = clean ? cleanWorkflow({ ...raw, name: finalName }) : { ...raw, name: finalName };

    // Upsert by name
    let existing = null;
    if (upsert) {
      existing = await withSpinner(`Looking for existing workflow: "${finalName}"…`, () => findExistingByName(client, finalName), "Checked");
    }

    if (existing) {
      // backup existing before overwrite
      const { data: old } = await client.get(`/workflows/${existing.id}`);
      const backupPath = await backupWorkflowJson({ id: existing.id, name: old?.name, json: old });

      if (dryRun) {
        console.log(`🟡 DRY-RUN: would UPDATE #${existing.id} "${finalName}" (backup: ${backupPath})`);
        continue;
      }

      const spin = createSpinner(`Updating: ${finalName} (#${existing.id})`).start();
      try {
        await client.put(`/workflows/${existing.id}`, wf0);
        spin.succeed(`Updated: ${finalName} (#${existing.id}) — backup saved`);
      } catch (e) {
        spin.fail("Update failed");
        console.error(e?.response?.data || e.message);
      }
    } else {
      if (dryRun) {
        console.log(`🟡 DRY-RUN: would CREATE "${finalName}"`);
        continue;
      }

      const spin = createSpinner(`Creating: ${finalName}`).start();
      try {
        const res = await client.post("/workflows", wf0);
        spin.succeed(`Created: ${finalName} (#${res.data?.id ?? "?"})`);
      } catch (e) {
        spin.fail("Create failed");
        console.error(e?.response?.data || e.message);
      }
    }
  }
}
