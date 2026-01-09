import { promises as fs } from "fs";
import axios from "axios";
import { lookup } from "dns/promises";
import { createSpinner, withSpinner } from "../utils/spinner.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { createN8nClient } from "../api/client.js";

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

export async function getWorkflowNameFromSource({ global, pathOrUrl }) {
  try {
    if (isUrl(pathOrUrl)) {
      const json = await downloadJsonWithRetry(pathOrUrl);
      return String(json?.name || "").trim();
    }
    const json = await readJsonFile(pathOrUrl);
    return String(json?.name || "").trim();
  } catch {
    return "";
  }
}

export async function importWorkflows(opts) {
  const client = await createN8nClient(opts.global);

  const src = String(opts.pathOrUrl || "").trim();
  if (!src) throw new Error("Import failed: pathOrUrl is required");

  const chosenName = String(opts.name || "").trim();

  const raw = await withSpinner(
    isUrl(src) ? "Downloading workflow…" : "Reading workflow…",
    async () => (isUrl(src) ? await downloadJsonWithRetry(src) : await readJsonFile(src)),
    "Loaded"
  );

  const finalName = chosenName || String(raw?.name || "").trim() || "Imported workflow";
  const wf = cleanWorkflow({ ...raw, name: finalName });

  const spin = createSpinner(`Importing (POST): ${finalName}`).start();
  try {
    const res = await client.post("/workflows", wf);
    spin.succeed(`Created: ${finalName} (#${res.data?.id ?? "?"})`);
  } catch (e) {
    spin.fail("Import failed");
    console.error(e?.response?.data || e.message);
  }
}
