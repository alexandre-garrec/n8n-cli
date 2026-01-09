import { readConfig, ensureProfile } from "../config/store.js";

export async function resolveProfile(globalOpts = {}) {
  const cfg = await readConfig();
  const fromFlag = (globalOpts.profile || "").trim();
  const profile = fromFlag || cfg.activeProfile || "default";
  await ensureProfile(profile);
  return profile;
}

export async function resolveCredentials(globalOpts = {}) {
  const profile = await resolveProfile(globalOpts);
  const cfg = await readConfig();
  const p = cfg.profiles?.[profile] || {};

  // 1) flags
  const urlFlag = (globalOpts.url || "").trim();
  const keyFlag = (globalOpts.key || "").trim();

  // 2) env (optionally per profile)
  const urlEnv = (process.env.N8N_URL || "").trim();
  const keyEnv = (process.env.N8N_API_KEY || "").trim();

  // 3) config profile
  const urlCfg = (p.url || "").trim();
  const keyCfg = (p.key || "").trim();

  const url = urlFlag || urlEnv || urlCfg || "";
  const key = keyFlag || keyEnv || keyCfg || "";

  const uiBaseUrl = (p.uiBaseUrl || "").trim(); // for "open in browser"
  const source = urlFlag || keyFlag ? "flags" : urlEnv || keyEnv ? "env" : urlCfg || keyCfg ? "config" : "none";

  return { url, key, profile, uiBaseUrl, source };
}

export function assertCredentials({ url, key }) {
  if (!url) throw new Error("Missing n8n URL. Set it in Settings, or pass --url, or set N8N_URL.");
  if (!key) throw new Error("Missing n8n API key. Set it in Settings, or pass --key, or set N8N_API_KEY.");
}
