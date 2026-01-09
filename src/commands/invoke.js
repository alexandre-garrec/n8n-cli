import axios from "axios";
import chalk from "chalk";
import inquirer from "inquirer";
import { getResolvedCreds, createN8nClient } from "../api/client.js";
import { loadHistory, saveHistory } from "../utils/history.js";
import { createSpinner } from "../utils/spinner.js";
import { editBodyMenu } from "../utils/jsonEditor.js";
import { deriveBaseUrl } from "../utils/urlHelper.js";

function findWebhookNodes(nodes) {
  return nodes.filter(
    (n) => n.type === "n8n-nodes-base.webhook" && !n.disabled
  );
}

function getNextNode(workflow, nodeName) {
  const connections = workflow.connections || {};
  if (!connections[nodeName] || !connections[nodeName].main) return null;
  // Getting the first node connected to output "main", index 0
  const nextConn = connections[nodeName].main[0];
  if (!nextConn || !nextConn.length) return null;

  const targetName = nextConn[0].node;
  return workflow.nodes.find((n) => n.name === targetName);
}

function extractSetKeys(node) {
  if (!node || node.type !== "n8n-nodes-base.set") return [];
  const keys = [];

  // 1. assignments (New Set)
  const assignments = node.parameters?.assignments;
  if (assignments) {
    if (assignments.value) {
      // "value" assignment mode
      assignments.value.forEach((x) => {
        if (x.name) keys.push(x.name);
      });
    }
    // "assignments" can also be nested under specific types in some versions, but usually "assignments"
  }

  // 2. values (Old Set)
  const values = node.parameters?.values; // primitive "string", "number" etc
  if (values) {
    if (values.string) values.string.forEach((x) => keys.push(x.name));
    if (values.number) values.number.forEach((x) => keys.push(x.name));
    if (values.boolean) values.boolean.forEach((x) => keys.push(x.name));
  }

  return keys;
}

function constructCurl(method, url, body) {
  let cmd = `curl -X ${method} "${url}"`;
  if (method !== "GET" && body) {
    // If body looks like JSON, add header
    try {
      JSON.parse(body);
      cmd += ` -H "Content-Type: application/json"`;
    } catch {}
    cmd += ` -d '${body}'`;
  }
  return cmd;
}

export async function invokeWorkflowWebhook(opts) {
  const { global, id } = opts;
  // ... (previous setup code stays same up to Step 3) ...

  // Re-inserting up to Step 3
  const client = await createN8nClient(global);
  const { data: wf } = await client.get(`/workflows/${id}`);
  const nodes = wf.nodes || [];
  const webhooks = findWebhookNodes(nodes);

  if (!webhooks.length) {
    console.log(
      chalk.yellow("No enabled webhook nodes found in this workflow.")
    );
    return;
  }

  let node = webhooks[0];
  if (webhooks.length > 1) {
    const { picked } = await inquirer.prompt([
      {
        type: "list",
        name: "picked",
        message: "Select webhook node:",
        choices: webhooks.map((n) => ({ name: n.name, value: n })),
      },
    ]);
    node = picked;
  }

  const pathPart = node.parameters?.path || "";
  const method = (node.parameters?.httpMethod || "GET").toUpperCase();
  const creds = await getResolvedCreds(global); // Derive base URL similar to ui.js logic
  const base = deriveBaseUrl(creds);

  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "Execution Mode:",
      choices: [
        { name: "Production ( /webhook/ )", value: "webhook" },
        { name: "Test ( /webhook-test/ )", value: "webhook-test" },
      ],
    },
  ]);

  const fullUrl = `${base}/${mode}/${pathPart}`;
  console.log(chalk.gray(`\nTarget: `) + chalk.cyan(fullUrl));
  console.log(chalk.gray(`Method: `) + chalk.cyan(method));

  let body = null;
  let dataObj = {};

  if (method !== "GET") {
    // 1. Load History
    const history = await loadHistory();
    if (history[id]) dataObj = history[id];

    // 2. Merge & Prompt Auto-detected defaults
    const nextNode = getNextNode(wf, node.name);
    if (nextNode) {
      const keys = extractSetKeys(nextNode);
      if (keys.length) {
        console.log(
          chalk.gray(`\nAuto-detected fields from "${nextNode.name}":`)
        );
        for (const k of keys) {
          const { val } = await inquirer.prompt([
            {
              type: "input",
              name: "val",
              message: `${k}:`,
              default: dataObj[k] || "",
            },
          ]);
          dataObj[k] = val;
        }
      }
    }

    // 3. Logic: Enter the Menu Editor immediately
    dataObj = await editBodyMenu(dataObj);
    body = JSON.stringify(dataObj, null, 2);
  }

  // 5. Save history
  if (method !== "GET" && dataObj) {
    await saveHistory(id, dataObj);
  }

  // 6. Execute & Retry Loop
  while (true) {
    const spin = createSpinner("Executing webhook…").start();
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const opts = { method, url: fullUrl, headers: {} };
      if (body) {
        opts.data = dataObj;
        opts.headers["Content-Type"] = "application/json";
      }
      const res = await axios(opts);
      spin.succeed(`Done: ${res.status} ${res.statusText}`);
      console.log(chalk.green(`\n✅ Status: ${res.status} ${res.statusText}`));
      console.log(chalk.gray("Response Data:"));
      console.dir(res.data, { depth: null, colors: true });
    } catch (e) {
      spin.fail("Request failed");
      console.log(chalk.red(`\n❌ Error: ${e.message}`));
      if (e.response) {
        console.log(chalk.red(`Status: ${e.response.status}`));
        console.log(chalk.gray("Response Data:"));
        console.dir(e.response.data, { depth: null, colors: true });
      }
    }

    const { postAction } = await inquirer.prompt([
      {
        type: "list",
        name: "postAction",
        message: "Result Action:",
        choices: [
          { name: "🔄 Resend request", value: "retry" },
          { name: "📝 Edit body", value: "edit" },
          { name: "🚪 Done", value: "exit" },
        ],
      },
    ]);

    if (postAction === "exit") break;

    if (postAction === "edit") {
      dataObj = await editBodyMenu(dataObj);
      body = JSON.stringify(dataObj, null, 2);
      if (method !== "GET") await saveHistory(id, dataObj);
    }
  }
}
