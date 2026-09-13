import { createServer } from "http"
import type { IncomingMessage, Server, ServerResponse } from "http"
import { parse } from "graphql"
import { afterEach, describe, expect, it } from "vitest"
import { executeRequest } from "./executeRequest"

const HelloQuery = parse("query Hello { hello }")

describe("executeRequest", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    const closing = server
    server = undefined
    await new Promise<void>((resolve, reject) => {
      closing.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })

  it("returns GraphQL data from a successful JSON response", async () => {
    const url = await listen((req, res) => {
      void jsonResponse(req, res, 200, { data: { hello: "world" } })
    })

    const data = await executeRequest(url, HelloQuery)

    expect(data).toEqual({ hello: "world" })
  })

  it("throws an annotated GraphQL error from a JSON error response", async () => {
    const url = await listen((req, res) => {
      void jsonResponse(req, res, 400, {
        errors: [
          {
            message: "Context creation failed: missing user",
            extensions: {
              code: "INTERNAL_SERVER_ERROR",
              stacktrace: ["Error: missing user"],
            },
          },
        ],
      })
    })

    await expect(executeRequest(url, HelloQuery)).rejects.toThrow(
      /Context creation failed: missing user/
    )
  })

  it("throws the HTTP status and raw body when the response is not JSON", async () => {
    const url = await listen((_req, res) => {
      res.statusCode = 502
      res.setHeader("content-type", "text/plain")
      res.end("bad gateway")
    })

    await expect(executeRequest(url, HelloQuery)).rejects.toThrow(
      "502 Error: bad gateway"
    )
  })

  async function listen(
    handler: (req: IncomingMessage, res: ServerResponse) => void
  ) {
    server = createServer(handler)
    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve())
    })
    const address = server.address()
    if (typeof address !== "object" || address === null) {
      throw new Error("Server did not bind to a TCP address")
    }
    return `http://127.0.0.1:${address.port}`
  }
})

async function jsonResponse(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>
) {
  await readBody(req)
  res.statusCode = status
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"))
    })
    req.on("error", reject)
  })
}
