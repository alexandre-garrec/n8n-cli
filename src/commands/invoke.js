import axios from "axios";
import chalk from "chalk";
import inquirer from "inquirer";
import { getResolvedCreds, createN8nClient } from "../api/client.js";
import { loadHistory, saveHistory } from "../utils/history.js";
import { createSpinner } from "../utils/spinner.js";

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

// Helper: Get value at path
function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

// Helper: Set value at path
function setPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, part) => acc[part], obj);
  if (target) target[last] = value;
}

// Helper: Delete at path
function deletePath(obj, path) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, part) => acc[part], obj);
  if (target) delete target[last];
}

// Helper: Generate Tree Choices
function generateTreeChoices(obj, prefix = "", pathPrefix = "") {
  let choices = [];
  const keys = Object.keys(obj);

  for (const k of keys) {
    const val = obj[k];
    const currentPath = pathPrefix ? `${pathPrefix}.${k}` : k;
    const isObj = typeof val === "object" && val !== null;

    if (isObj) {
      choices.push({
        name: `${prefix}${k}:`,
        value: { type: "object", path: currentPath },
      });
      // Recurse
      choices = choices.concat(
        generateTreeChoices(val, prefix + "  ", currentPath)
      );
    } else {
      let valStr = JSON.stringify(val);
      if (valStr.length > 40) valStr = valStr.substring(0, 37) + "...";
      choices.push({
        name: `${prefix}${k}: ${chalk.gray(valStr)}`,
        value: { type: "primitive", path: currentPath },
      });
    }
  }
  return choices;
}

// Helper: Interactive Menu Editor (Tree View)
async function editBodyMenu(dataObj) {
  while (true) {
    // console.log(chalk.gray("\nCurrent Body (Tree View):"));
    // console.log(JSON.stringify(dataObj, null, 2)); // Valid to hide this if tree is good enough, but helpful for context
    console.log(" ");

    const choices = generateTreeChoices(dataObj);

    choices.unshift(new inquirer.Separator());
    choices.push(new inquirer.Separator());
    choices.push({ name: "➕ Add field to Root", value: { type: "add_root" } });
    choices.push({ name: "🚀 Execute request", value: { type: "done" } });

    const { selection } = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: "Tree Editor:",
        choices: choices,
        pageSize: 20,
        loop: false,
        default: choices.length - 1,
      },
    ]);

    if (selection.type === "done") return dataObj;

    if (selection.type === "add_root") {
      const { newKey, newVal } = await inquirer.prompt([
        { type: "input", name: "newKey", message: "New Key (Root):" },
        { type: "input", name: "newVal", message: "Value (JSON or string):" },
      ]);
      if (newKey) {
        try {
          dataObj[newKey] = JSON.parse(newVal);
        } catch {
          dataObj[newKey] = newVal;
        }
      }
      continue;
    }

    const { path, type } = selection;

    if (type === "primitive") {
      // Edit Value
      const currentVal = getPath(dataObj, path);
      const { newVal } = await inquirer.prompt([
        {
          type: "input",
          name: "newVal",
          message: `Edit value for "${path}" (JSON or string):`,
          default:
            typeof currentVal === "string"
              ? currentVal
              : JSON.stringify(currentVal),
        },
      ]);

      try {
        setPath(dataObj, path, JSON.parse(newVal));
      } catch {
        setPath(dataObj, path, newVal);
      }
    }

    if (type === "object") {
      // Object Options
      const { objAction } = await inquirer.prompt([
        {
          type: "list",
          name: "objAction",
          message: `Action for "${path}":`,
          choices: [
            { name: "➕ Add child field", value: "add_child" },
            { name: "❌ Remove this object", value: "remove" },
            { name: "🔙 Back", value: "back" },
          ],
        },
      ]);

      if (objAction === "remove") {
        deletePath(dataObj, path);
      }

      if (objAction === "add_child") {
        const { newKey, newVal } = await inquirer.prompt([
          { type: "input", name: "newKey", message: "New Key:" },
          { type: "input", name: "newVal", message: "Value (JSON or string):" },
        ]);
        if (newKey) {
          const targetObj = getPath(dataObj, path);
          try {
            targetObj[newKey] = JSON.parse(newVal);
          } catch {
            targetObj[newKey] = newVal;
          }
        }
      }
    }
  }
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
  const creds = await getResolvedCreds(global);
  let base = String(creds.uiBaseUrl || creds.url || "").trim();
  base = base
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");

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
