import { promises as fs } from "fs";
import path from "path";
import envPaths from "env-paths";

const paths = envPaths("cli-n8n");
const FILE = path.join(paths.config, "favorites.json");

async function ensureConfigDir() {
  await fs.mkdir(paths.config, { recursive: true });
}

export async function loadFavorites() {
  try {
    const data = await fs.readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function toggleFavorite(id) {
  await ensureConfigDir();
  const list = await loadFavorites();
  const set = new Set(list);
  if (set.has(String(id))) {
    set.delete(String(id));
  } else {
    set.add(String(id));
  }
  const newList = Array.from(set);
  await fs.writeFile(FILE, JSON.stringify(newList), "utf-8");
  return set.has(String(id));
}
