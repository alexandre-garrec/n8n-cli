import { promises as fs } from "fs";
import path from "path";
import envPaths from "env-paths";

const paths = envPaths("n8n-cli");
const BACKUP_DIR = path.join(paths.data, "backups");

export async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  return BACKUP_DIR;
}

export function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function backupWorkflowJson({ id, name, json }) {
  await ensureBackupDir();
  const safe = String(name || "workflow")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "workflow";

  const file = path.join(BACKUP_DIR, `${stamp()}__${id || "noid"}__${safe}.json`);
  await fs.writeFile(file, JSON.stringify(json, null, 2), "utf-8");
  return file;
}
