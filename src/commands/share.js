import http from "http";
import os from "os";
import { spawn, execFileSync } from "child_process";
import { createN8nClient } from "../api/client.js";
import { cleanWorkflow } from "../utils/cleanWorkflow.js";
import { createSpinner, withSpinner } from "../utils/spinner.js";
import { copy } from "../utils/clipboard.js";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function shareWorkflow(opts) {
  const client = await createN8nClient(opts.global);

  const id = String(opts.id);
  const port = Number(opts.port || 3333);
  const host = opts.public ? "0.0.0.0" : "127.0.0.1";

  const workflow = await withSpinner(
    `Loading workflow #${id}…`,
    async () => {
      const { data } = await client.get(`/workflows/${id}`);
      return data;
    },
    "Workflow loaded"
  );

  const wf = opts.clean === false ? workflow : cleanWorkflow(workflow);

  // Per your requirement: shared JSON filename uses workflow id (lowercase safe)
  const fileBase = String(id).toLowerCase();
  const filePath = `/${fileBase}.json`;
  const json = JSON.stringify(wf, null, 2);

  const server = http.createServer((req, res) => {
    try {
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end("Method Not Allowed");
      }
      const url = new URL(req.url, "http://localhost");

      if (url.pathname === "/") {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(`<html><body style="font-family:system-ui;padding:24px">
<h2>n8n-cli share</h2>
<p>Workflow: <b>${wf.name || ""}</b></p>
<p>Download: <a href="${filePath}">${fileBase}.json</a></p>
</body></html>`);
      }

      if (decodeURIComponent(url.pathname) !== filePath) {
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

  const localHost = host === "0.0.0.0" ? getLocalIP() : host;
  const localUrl = `http://${localHost}:${port}${filePath}`;

  console.log(`\n📤 Sharing workflow: "${wf.name}"\n`);
  console.log("➡️ Local URL:");
  console.log("   " + localUrl);
  await copy(localUrl);

  const wantTunnel =
    String(opts.tunnel || "cloudflare").toLowerCase() === "cloudflare";
  let tunnelChild = null;

  if (wantTunnel) {
    const exe = resolveCloudflaredPath(opts.cloudflared);
    if (!exe) {
      console.log("\n⚠️ cloudflared not found → local link only");
      console.log("   Install it or pass: --cloudflared <path>");
    } else {
      const spin = createSpinner(
        "Waiting for Cloudflare link (trycloudflare)…"
      ).start();

      tunnelChild = spawn(
        exe,
        ["tunnel", "--url", `http://127.0.0.1:${port}`],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let base = null;
      const onData = (d) => {
        const m = d.toString().match(/https:\/\/[\w-]+\.trycloudflare\.com/);
        if (m && !base) base = m[0];
      };

      tunnelChild.stdout.on("data", onData);
      tunnelChild.stderr.on("data", onData);

      // Fast: show as soon as we capture URL, with minimal wait loop
      (async () => {
        try {
          for (let i = 0; i < 60 && !base; i++) await sleep(100);
          if (!base)
            throw new Error("No trycloudflare URL received (timeout).");
          const publicUrl = base + filePath;

          spin.succeed("Cloudflare link ready");
          console.log("\n➡️ Public URL (Cloudflare):");
          console.log("   " + publicUrl);
          await copy(publicUrl);

          console.log("\n(Links copied to clipboard)\n");
          console.log("⏹️ Press CTRL+C to stop");
        } catch (e) {
          spin.fail("Cloudflare tunnel failed");
          console.log("Details:", e?.message || e);
          console.log("\n⏹️ Press CTRL+C to stop");
        }
      })();

      tunnelChild.on("error", (e) => {
        spin.fail("Failed to start cloudflared");
        console.log("Details:", e?.message || e);
      });

      tunnelChild.on("exit", () => {
        // no-op
      });
    }
  }

  process.on("SIGINT", () => {
    try {
      if (tunnelChild) tunnelChild.kill("SIGINT");
    } catch {}
    server.close(() => process.exit(0));
  });

  await new Promise(() => {});
}
