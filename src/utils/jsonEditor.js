import inquirer from "inquirer";
import chalk from "chalk";

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
export async function editBodyMenu(dataObj) {
  while (true) {
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
