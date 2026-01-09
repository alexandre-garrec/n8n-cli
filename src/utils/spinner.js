import ora from "ora";

export function createSpinner(text) {
  return ora({ text });
}

export async function withSpinner(text, fn, successText = "Done") {
  const s = createSpinner(text).start();
  try {
    const res = await fn();
    s.succeed(successText);
    return res;
  } catch (e) {
    s.fail("Failed");
    throw e;
  }
}
