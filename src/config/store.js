import envPaths from "env-paths";
import { promises as fs } from "fs";
import path from "path";

const APP_NAME = "cli-n8n";
const paths = envPaths(APP_NAME);
const CONFIG_FILE = path.join(paths.config, "config.json");

async function ensureDir() {
  await fs.mkdir(paths.config, { recursive: true });
}

export function getConfigPath() {
  return CONFIG_FILE;
}

export async function readConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, "utf-8"));
  } catch {
    return {
      activeProfile: "default",
      profiles: {
        default: { url: "", key: "", uiBaseUrl: "" },
      },
    };
  }
}

export async function writeConfig(next) {
  await ensureDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function updateConfig(patch) {
  const curr = await readConfig();
  const next = { ...curr, ...patch };
  await writeConfig(next);
  return next;
}

export async function ensureProfile(profile) {
  const cfg = await readConfig();
  cfg.profiles = cfg.profiles || {};
  if (!cfg.profiles[profile])
    cfg.profiles[profile] = { url: "", key: "", uiBaseUrl: "" };
  if (!cfg.activeProfile) cfg.activeProfile = profile;
  await writeConfig(cfg);
  return cfg;
}
