import http from "http";
import { lookup } from "dns/promises";
import os from "os";
import { spawn, execFileSync } from "child_process";
import { createN8nClient } from "../api/client.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { withSpinner, createSpinner } from "../utils/spinner.js";

function idToFileBase(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function resolveCloudflaredPath(explicit) {
  const candidates = [
    explicit,
    "cloudflared",
    "/usr/local/bin/cloudflared",
    "/opt/homebrew/bin/cloudflared",
    "/usr/bin/cloudflared",
  ].filter(Boolean);

  for (const c of candidates) {
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch {}
  }
  return null;
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const n of Object.values(nets)) {
    for (const net of n || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function waitForDns(host, { timeoutMs = 3000, intervalMs = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await lookup(host);
      return true;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export async function shareWorkflow(opts) {
  const client = await createN8nClient({
    url: opts.global.url,
    key: opts.global.key,
  });

  const id = String(opts.id);
  const port = Number(opts.port || 3333);
  const host = opts.public ? "0.0.0.0" : "127.0.0.1";

  const workflow = await withSpinner(
    `Loading workflow #${id}…`,
    async () => (await client.get(`/workflows/${id}`)).data,
    "Workflow loaded"
  );

  const wf = opts.clean === false ? workflow : cleanWorkflow(workflow);

  // ✅ file is always: /<id>.json (lowercase safe)
  const fileBase = idToFileBase(id) || "workflow";
  const filePath = `/${fileBase}.json`;
  const json = JSON.stringify(wf, null, 2);

  const server = http.createServer((req, res) => {
    try {
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end("Method Not Allowed");
      }

      const url = new URL(req.url, "http://localhost");

      // Landing page
      if (url.pathname === "/") {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(`<html><body style="font-family:system-ui;padding:24px">
<h2>n8n-cli share</h2>
<p><b>Workflow:</b> ${escapeHtml(wf.name || "")}</p>
<p><b>Download:</b> <a href="${filePath}">${fileBase}.json</a></p>
</body></html>`);
      }

      // Compare decoded pathname (safe against encoding)
      const decodedPath = decodeURIComponent(url.pathname);
      if (decodedPath !== filePath) {
        res.writeHead(404);
        return res.end("Not Found");
      }

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.json"`,
        "Cache-Control": "no-store",
      });
      return res.end(json);
    } catch {
      res.writeHead(500);
      return res.end("Internal Server Error");
    }
  });

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, resolve);
  });

  // Keep long-lived
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.keepAliveTimeout = 0;
  server.timeout = 0;

  const localHost = host === "0.0.0.0" ? getLocalIP() : host;
  const localUrl = `http://${localHost}:${port}${filePath}`;

  console.log(`\n📤 Sharing workflow: "${wf.name}"`);
  console.log(`🆔 File: ${fileBase}.json`);
  console.log("\n➡️ Local URL:");
  console.log("   " + localUrl);

  const wantTunnel =
    String(opts.tunnel || "cloudflare").toLowerCase() === "cloudflare";
  let tunnelChild = null;

  if (wantTunnel) {
    const exe = resolveCloudflaredPath(opts.cloudflared);

    if (!exe) {
      console.log("\n⚠️ cloudflared not found → local link only");
      console.log("   Install it or pass: --cloudflared <path>");
    } else {
      const spin = createSpinner("Starting Cloudflare tunnel…").start();

      tunnelChild = spawn(
        exe,
        ["tunnel", "--url", `http://127.0.0.1:${port}`],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let printed = false;

      const onData = (d) => {
        if (printed) return;

        const text = d.toString();
        const m = text.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
        if (!m) return;

        printed = true;
        const base = m[0];
        const publicUrl = base + filePath;

        spin.succeed("Cloudflare URL received");
        console.log("\n➡️ Public URL (Cloudflare):");
        console.log("   " + publicUrl);

        // ✅ DNS warmup (non bloquant, PAS de await direct)
        (async () => {
          try {
            const host = new URL(publicUrl).hostname;
            await waitForDns(host, { timeoutMs: 3000, intervalMs: 200 });
          } catch {}
        })();
      };

      tunnelChild.stdout.on("data", onData);
      tunnelChild.stderr.on("data", onData);

      tunnelChild.on("error", (e) => {
        try {
          spin.fail("Failed to start cloudflared");
        } catch {}
        console.log("Details:", e?.message || e);
      });

      tunnelChild.on("exit", (code) => {
        if (!printed) {
          try {
            spin.fail("cloudflared exited before URL");
          } catch {}
          console.log("Exit code:", code);
        }
      });
    }
  }

  process.on("SIGINT", () => {
    try {
      if (tunnelChild) tunnelChild.kill("SIGINT");
    } catch {}
    server.close(() => process.exit(0));
  });

  // Stay on links screen forever
  await new Promise(() => {});
}
