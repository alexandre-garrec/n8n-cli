import ora from "ora";

/**
 * Spinner standardisé pour le CLI
 */
export function createSpinner(text = "Chargement...") {
  return ora({
    text,
    spinner: "dots",
    color: "cyan",
  });
}

/**
 * Wrapper async avec spinner
 * - successText: texte optionnel au succeed()
 *
 * Usage:
 *   const data = await withSpinner("Chargement…", async () => {...}, "OK");
 */
export async function withSpinner(text, fn, successText) {
  const spinner = createSpinner(text).start();
  try {
    const result = await fn(spinner);
    spinner.succeed(successText || undefined);
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}
