import type { IncomingMessage, ServerResponse } from "http"
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core"
import type { DocumentNode } from "graphql"
import { print } from "graphql"
import { inject } from "light-my-request"
import { graphql, HttpResponse, type RequestHandler } from "msw"
import type { Response } from "supertest"
import request from "supertest"
import { handleResult } from "./handleResult"
import { isRecord } from "./isRecord"
import { parseGraphqlData } from "./parseGraphqlData"

type GraphqlData<D> = DocumentNode extends D
  ? Record<string, unknown>
  : ResultOf<D> extends Record<string, unknown>
  ? ResultOf<D>
  : Record<string, unknown>

export type TestOperations = {
  /**
   * Return the typed result of a GraphQL query operation.
   *
   * @returns just the result data, without headers, status, etc.
   * @throws errors if anything goes wrong: bad responses, graphql errors, etc.
   */
  query: <D extends DocumentNode>(
    query: D,
    variables?: VariablesOf<D>
  ) => Promise<GraphqlData<D>>
  /**
   * Return the typed result of a GraphQL mutation operation.
   *
   * @returns just the result data, without headers, status, etc.
   * @throws errors if anything goes wrong: bad responses, graphql errors, etc.
   */
  mutation: <D extends DocumentNode>(
    query: D,
    variables?: VariablesOf<D>
  ) => Promise<GraphqlData<D>>
  /**
   * Get the raw response from a GraphQL operation. Can be useful if you need to
   * make assertations about errors or other metadata.
   *
   * @returns a Supertest response object
   */
  getResponse: (query: DocumentNode, variables?: unknown) => Promise<Response>
}

export type GraphqlTestKit = {
  handlers: RequestHandler[]
  operations: TestOperations
}

type RequestListenerFn = (
  req: IncomingMessage,
  res: ServerResponse,
  ...rest: unknown[]
) => unknown

export function graphqlTestKitFactory<Args extends unknown[]>(options: {
  init: (...args: Args) => Promise<unknown>
}): (...args: Args) => Promise<GraphqlTestKit> {
  return async (...args: Args) => {
    const app = await options.init(...args)
    if (!isRequestListener(app)) {
      throw new Error(
        "graphqlTestKitFactory init must return a request listener"
      )
    }

    const operations = createTestOperationsFromApp(app)
    const handlers: RequestHandler[] = [
      graphql.operation(async ({ request, query, variables }) => {
        const cookie = request.headers.get("cookie")

        const response = await inject(app, {
          method: "POST",
          url: "/api",
          headers: {
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          payload: { query, variables },
        })

        const headers = new Headers()
        for (const [key, value] of Object.entries(response.headers)) {
          copyHeader(headers, key, value)
        }

        return HttpResponse.json(parseInjectedJson(response.body), {
          status: response.statusCode,
          headers,
        })
      }),
    ]

    return { handlers, operations }
  }
}

function createTestOperationsFromApp(app: RequestListenerFn): TestOperations {
  const agent = request.agent(app)

  async function mutation<D extends DocumentNode>(
    query: D,
    variables?: VariablesOf<D>
  ): Promise<GraphqlData<D>> {
    const response = await getResponse(query, variables)
    const body = readResponseBody(response)
    const result = await handleResult({ body })
    return parseGraphqlData<GraphqlData<D>>(result.data)
  }

  const getResponse = async (query: DocumentNode, variables?: unknown) => {
    const q = print(query)

    return new Promise<Response>((resolve, reject) => {
      void agent
        .post(`/api`)
        .send({
          query: q,
          variables,
        })
        .set("Accept", "application/json")
        .end(function (error, response) {
          if (error) {
            reject(error)
          } else {
            resolve(response)
          }
        })
    })
  }

  return { query: mutation, mutation, getResponse }
}

function isRequestListener(app: unknown): app is RequestListenerFn {
  return typeof app === "function"
}

function copyHeader(headers: Headers, key: string, value: unknown) {
  if (value === undefined) return
  if (Array.isArray(value)) {
    for (const item of value) {
      headers.append(key, String(item))
    }
    return
  }
  headers.set(key, String(value))
}

function parseInjectedJson(body: string): Record<string, unknown> {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new Error(`In-process GraphQL response was not JSON: ${body}`)
  }
  if (!isRecord(json)) {
    throw new Error("In-process GraphQL response JSON was not an object")
  }
  return json
}

function readResponseBody(response: Response): Record<string, unknown> {
  const body: unknown = response.body
  if (!isRecord(body)) {
    throw new Error("GraphQL response body was not JSON")
  }
  return body
}
