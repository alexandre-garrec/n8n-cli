import axios from "axios";
import { resolveCredentials, assertCredentials } from "../auth/resolve.js";

export async function createN8nClient(globalOpts = {}) {
  const creds = await resolveCredentials(globalOpts);
  assertCredentials(creds);

  return axios.create({
    baseURL: creds.url,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": creds.key,
    },
  });
}

export async function getResolvedCreds(globalOpts = {}) {
  const creds = await resolveCredentials(globalOpts);
  return creds;
}
