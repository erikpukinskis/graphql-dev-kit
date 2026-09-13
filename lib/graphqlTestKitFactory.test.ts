import type { IncomingMessage, ServerResponse } from "http"
import { parse } from "graphql"
import { setupServer } from "msw/node"
import { afterEach, describe, expect, it } from "vitest"
import { graphqlTestKitFactory } from "./graphqlTestKitFactory"

const TypenameQuery = parse("query Typename { __typename }")

describe("graphqlTestKitFactory", () => {
  const createKit = graphqlTestKitFactory({
    init: () => Promise.resolve(createTestApp()),
  })

  afterEach(() => {
    cookiesSeen.length = 0
  })

  it("runs a direct operation against the request listener", async () => {
    const kit = await createKit()
    const data = await kit.operations.query(TypenameQuery)

    expect(data).toEqual({ cookie: null, __typename: "Query" })
  })

  it("forwards cookies on sequential direct operations", async () => {
    const kit = await createKit()

    await kit.operations.getResponse(TypenameQuery)
    await kit.operations.getResponse(TypenameQuery)

    expect(cookiesSeen).toEqual([undefined, "session=from-app"])
  })

  it("intercepts GraphQL requests, forwards cookies, and copies response headers", async () => {
    const kit = await createKit()
    const server = setupServer(...kit.handlers)
    server.listen({ onUnhandledRequest: "error" })

    try {
      const response = await fetch("http://test.example/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "session=from-client",
        },
        body: JSON.stringify({
          query: "query Typename { __typename }",
        }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("x-kit-header")).toBe("from-app")
      expect(response.headers.get("set-cookie")).toContain("session=from-app")
      expect(await response.json()).toEqual({
        data: { cookie: "session=from-client", __typename: "Query" },
      })
      expect(cookiesSeen).toEqual(["session=from-client"])
    } finally {
      server.close()
    }
  })
})

const cookiesSeen: Array<string | undefined> = []

function createTestApp() {
  return (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on("end", () => {
      cookiesSeen.push(req.headers.cookie)
      res.statusCode = 200
      res.setHeader("content-type", "application/json")
      res.setHeader("x-kit-header", "from-app")
      res.setHeader("set-cookie", "session=from-app")
      res.end(
        JSON.stringify({
          data: {
            cookie: req.headers.cookie ?? null,
            __typename: "Query",
          },
        })
      )
    })
  }
}
