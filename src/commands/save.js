import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";
import { createN8nClient } from "../api/client.js";
import { withSpinner } from "../utils/spinner.js";

function sanitize(str) {
  return str.replace(/[^a-z0-9\.\-\_]/gi, "_");
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function pad(n) {
  return n < 10 ? "0" + n : n;
}

function getTimestamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`;
}

export async function saveWorkflowVersion(opts) {
  const { global, id, name, comment } = opts;
  const client = await createN8nClient(global);

  // 1. Fetch full workflow data
  const wf = await withSpinner(
    "Fetching workflow data…",
    async () => {
      const { data } = await client.get(`/workflows/${id}`);
      return data;
    },
    "Fetched"
  );

  // 2. Prepare destination
  // Sanitize workflow name for folder
  const safeName = sanitize(name || "untitled_workflow").trim();
  const versionsDir = path.join(".", "versions", safeName);
  await ensureDir(versionsDir);

  // 3. Prepare filename
  // Format: YYYY-MM-DD_HH-mm-ss__comment.json
  const timestamp = getTimestamp();
  const safeComment = sanitize(comment || "")
    .trim()
    .replace(/\s+/g, "_");
  const filename = safeComment
    ? `${timestamp}__${safeComment}.json`
    : `${timestamp}.json`;

  const filePath = path.join(versionsDir, filename);

  // 4. Save
  await fs.writeFile(filePath, JSON.stringify(wf, null, 2), "utf-8");

  console.log(chalk.green(`\n✅ Saved version to:`));
  console.log(chalk.white(filePath));
}

export async function listWorkflowVersions(name) {
  const safeName = sanitize(name || "untitled_workflow").trim();
  const versionsDir = path.join(".", "versions", safeName);

  try {
    const files = await fs.readdir(versionsDir);
    // Filter for JSON files and sort reverse (newest first)
    return files
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .map((f) => ({
        name: f,
        path: path.join(versionsDir, f),
      }));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
