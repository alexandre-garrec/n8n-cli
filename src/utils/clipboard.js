import clipboardy from "clipboardy";

export async function copy(text) {
  try {
    await clipboardy.write(String(text || ""));
    return true;
  } catch {
    return false;
  }
}
