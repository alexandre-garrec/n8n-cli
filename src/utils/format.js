import chalk from "chalk";

export function printHeader(title) {
  console.log(chalk.bold("\n" + title));
}

export function printWorkflowLine(w) {
  const dot = w.active ? chalk.green("●") : chalk.gray("○");
  console.log(`${dot} ${chalk.cyan(w.name)} ${chalk.gray(`(#${w.id})`)}`);
}

export function printInfo(msg) {
  console.log(chalk.gray(msg));
}

export function printOk(msg) {
  console.log(chalk.green("✅ " + msg));
}

export function printWarn(msg) {
  console.log(chalk.yellow("⚠️  " + msg));
}

export function printErr(msg) {
  console.log(chalk.red("❌ " + msg));
}
