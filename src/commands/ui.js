import path from "path";
import { createN8nClient } from "../api/client.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { writeJson, ensureDir } from "../utils/io.js";
import {
  pickWorkflow,
  pickActionAfterSelect,
  confirm,
  askEditDefaults,
} from "../utils/prompt.js";
import {
  printHeader,
  printWorkflowLine,
  printOk,
  printWarn,
  printErr,
  printInfo,
} from "../utils/format.js";
import { createSpinner, withSpinner } from "../utils/spinner.js";
import { shareWorkflow } from "./share.js";

export async function uiWorkflows(opts) {
  const client = await createN8nClient({
    url: opts.global.url,
    key: opts.global.key,
  });
  const search = (opts.search || "").toLowerCase().trim();

  while (true) {
    const workflows = await withSpinner(
      "Loading workflows…",
      async () => {
        const { data } = await client.get("/workflows");
        const list = data?.data || data || [];
        return list.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "en", {
            sensitivity: "base",
          })
        );
      },
      "Workflows loaded"
    );

    const filtered = search
      ? workflows.filter((w) =>
          String(w.name || "")
            .toLowerCase()
            .includes(search)
        )
      : workflows;

    // printHeader(`📄 Workflows (${filtered.length})`);
    // filtered.slice(0, 20).forEach(printWorkflowLine);
    if (filtered.length > 20)
      printInfo(`… and ${filtered.length - 20} more (use --search)`);

    if (!filtered.length) {
      printWarn("No workflows found. Try another filter.");
      return;
    }

    const picked = await pickWorkflow(filtered, {
      message: "Select a workflow",
    });
    if (!picked) return;

    const action = await pickActionAfterSelect();
    if (action === "quit") return;
    if (action === "back") continue;

    const full = await withSpinner(
      `Loading "${picked.name}"…`,
      async () => {
        const { data } = await client.get(`/workflows/${picked.id}`);
        return data;
      },
      "Workflow loaded"
    );

    if (action === "delete") {
      const ok = await confirm(
        `Delete "${picked.name}" (#${picked.id})?`,
        false
      );
      if (!ok) continue;

      const s = createSpinner(`Deleting: ${picked.name}`).start();
      try {
        await client.delete(`/workflows/${picked.id}`);
        s.succeed(`Deleted: ${picked.name}`);
        printOk("Done");
      } catch (err) {
        s.fail(`Delete failed: ${picked.name}`);
        printErr(err?.response?.data || err.message);
      }
      continue;
    }

    if (action === "export") {
      const folder = path.resolve("exports");
      await ensureDir(folder);

      const s = createSpinner(`Exporting: ${picked.name}`).start();
      try {
        const wf = cleanWorkflow(full);
        const file = path.join(
          folder,
          `${safeName(picked.name)}__${picked.id}.json`
        );
        await writeJson(file, wf);
        s.succeed("Export complete");
        printOk(`Saved: ${file}`);
      } catch (err) {
        s.fail("Export failed");
        printErr(err?.response?.data || err.message);
      }
      continue;
    }

    if (action === "edit") {
      const changes = await askEditDefaults({
        id: picked.id,
        name: picked.name,
        active: picked.active,
      });

      const base = cleanWorkflow(full);
      const payload = { ...base, name: changes.name, active: changes.active };

      const ok = await confirm(`Apply changes to "${picked.name}"?`, true);
      if (!ok) continue;

      const s = createSpinner(`Updating: ${picked.name}`).start();
      try {
        await client.put(`/workflows/${picked.id}`, payload);
        s.succeed("Update complete");
        printOk(`Updated: ${changes.name} (#${picked.id})`);
      } catch (err) {
        s.stop();
        printWarn("Update with 'active' failed, retrying without 'active'…");
        const retryPayload = { ...payload };
        delete retryPayload.active;

        const s2 = createSpinner(`Retry update: ${picked.name}`).start();
        try {
          await client.put(`/workflows/${picked.id}`, retryPayload);
          s2.succeed("Update complete (without active)");
          printOk(`Updated (without active): ${changes.name} (#${picked.id})`);
        } catch (err2) {
          s2.fail("Update failed");
          printErr(err2?.response?.data || err2.message);
        }
      }
      continue;
    }

    if (action === "share") {
      // ✅ Zero questions. Defaults:
      // - port 3333
      // - bind 127.0.0.1
      // - tunnel cloudflare
      // - clean true
      await shareWorkflow({
        global: opts.global,
        id: picked.id,
        port: "3333",
        public: false,
        clean: true,
        tunnel: "cloudflare",
        // name undefined => workflow name by default
      });

      // IMPORTANT: Do not redraw menu or list after links are shown.
      // shareWorkflow keeps the process alive until Ctrl+C.
      return;
    }
  }
}

function safeName(name = "workflow") {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
