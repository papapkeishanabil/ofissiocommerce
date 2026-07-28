import "server-only";

import type { z } from "zod";

import { createValidationError } from "./safe-error-response";

export function validateInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw createValidationError();
  }
  return parsed.data;
}

export function parseQueryParams<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  request: Request,
): z.infer<TSchema> {
  const url = new URL(request.url);
  const payload = Object.fromEntries(url.searchParams.entries());
  return validateInput(schema, payload);
}
