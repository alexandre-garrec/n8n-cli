export function deriveBaseUrl(creds) {
  let base = String(creds.uiBaseUrl || creds.url || "").trim();
  // If base is the API url (e.g. ends in /api/v1), strip it
  base = base
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
  return base;
}
