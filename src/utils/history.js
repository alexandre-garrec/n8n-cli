import { promises as fs } from "fs";
import path from "path";
import envPaths from "env-paths";

const paths = envPaths("cli-n8n");
const FILE = path.join(paths.config, "webhook-history.json");

async function ensureConfigDir() {
  await fs.mkdir(paths.config, { recursive: true });
}

export async function loadHistory() {
  try {
    const data = await fs.readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveHistory(id, body) {
  await ensureConfigDir();
  const history = await loadHistory();
  history[String(id)] = body;
  await fs.writeFile(FILE, JSON.stringify(history, null, 2), "utf-8");
}
