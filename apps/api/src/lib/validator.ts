import type { ZodType } from "zod";
import type { ValidationTargets } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator as zv } from "@hono/zod-validator";

export const zValidator = <
  T extends ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result, c) => {
    if (result.success) return;

    const message = result.error.issues
      .map((issue) => `[${target}.${issue.path.join(".")}] ${issue.message}`)
      .join("; ");

    throw new HTTPException(400, {
      res: c.json({
        code: "VALIDATION_ERROR",
        message,
      }),
    });
  });
