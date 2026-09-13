import { z } from "zod"
import { isRecord } from "./isRecord"

export function parseGraphqlData<T extends Record<string, unknown>>(
  data: unknown
): T {
  return z.custom<T>((value) => isRecord(value)).parse(data)
}
