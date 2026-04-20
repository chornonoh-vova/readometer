import app from "../../src/app";
import { setAuthenticatedUser } from "../mocks/auth";
import type { TestUser } from "./factories";

export type CallOptions = {
  as?: TestUser;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
};

export async function call(
  method: string,
  path: string,
  opts: CallOptions = {},
): Promise<Response> {
  setAuthenticatedUser(opts.as ?? null);

  const headers: Record<string, string> = { ...opts.headers };
  let body: string | FormData | undefined;

  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }

  return app.request(path, { method, headers, body });
}
