import { readConfig } from "../config/store.js";

export async function resolveCredentials(globalOpts = {}) {
  // 1) CLI flags
  const urlFlag = (globalOpts.url || "").trim();
  const keyFlag = (globalOpts.key || "").trim();

  // 2) Environment variables (good for CI/Docker)
  const urlEnv = (process.env.N8N_URL || "").trim();
  const keyEnv = (process.env.N8N_API_KEY || "").trim();

  // 3) Saved config (Settings menu)
  const cfg = await readConfig();
  const urlCfg = (cfg.url || "").trim();
  const keyCfg = (cfg.key || "").trim();

  const url = urlFlag || urlEnv || urlCfg || "";
  const key = keyFlag || keyEnv || keyCfg || "";

  const source =
    urlFlag || keyFlag ? "flags" :
    urlEnv || keyEnv ? "env" :
    urlCfg || keyCfg ? "config" :
    "none";

  return { url, key, source };
}

export function assertCredentials({ url, key }) {
  if (!url) throw new Error("Missing n8n URL. Set it in Settings, or pass --url, or set N8N_URL.");
  if (!key) throw new Error("Missing n8n API key. Set it in Settings, or pass --key, or set N8N_API_KEY.");
}
