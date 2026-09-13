import type { DocumentNode } from "graphql"
import { print } from "graphql"
import { z } from "zod"
import { handleResult } from "./handleResult"
import { parseGraphqlData } from "./parseGraphqlData"
import { parseOrThrow } from "./parseOrThrow"

const GraphqlResponseBody = z.object({
  data: z.record(z.unknown()).nullable().optional(),
  errors: z.array(z.unknown()).optional(),
})

export async function executeRequest<Data extends Record<string, unknown>>(
  url: string,
  document: DocumentNode,
  variables?: Record<string, unknown>
): Promise<Data> {
  const q = print(document)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      query: q,
      variables,
    }),
  })

  const text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${response.status} Error: ${text}`)
  }

  const parsed = parseOrThrow(GraphqlResponseBody, json, "GraphQL response")

  const body: Record<string, unknown> = {}
  if (parsed.data !== undefined) {
    body.data = parsed.data
  }
  if (parsed.errors !== undefined) {
    body.errors = parsed.errors
  }

  const result = await handleResult({ body })
  return parseGraphqlData<Data>(result.data)
}
