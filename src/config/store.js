import envPaths from "env-paths";
import { promises as fs } from "fs";
import path from "path";

const APP_NAME = "n8n-cli";
const paths = envPaths(APP_NAME);
const CONFIG_FILE = path.join(paths.config, "config.json");

async function ensureDir() {
  await fs.mkdir(paths.config, { recursive: true });
}

export async function readConfig() {
  try {
    const txt = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(txt);
  } catch {
    return {};
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

export function getConfigPath() {
  return CONFIG_FILE;
}
