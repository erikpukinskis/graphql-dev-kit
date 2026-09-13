import type { ResponseWithBody } from "~/handleResult"

type More = Record<string, unknown>

export const CONTEXT_CREATION_FAILED: ResponseWithBody & More = {
  text: '{"errors":[{"message":"Context creation failed: passportSessionMiddleware is not defined","extensions":{"code":"INTERNAL_SERVER_ERROR","stacktrace":["ReferenceError: passportSessionMiddleware is not defined","    at /Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:75:5","    at new Promise (<anonymous>)","    at Module.buildContext (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:60:9)","    at context (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/initServer.ts:263:9)","    at context (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/express4/index.ts:83:24)","    at ApolloServer.executeHTTPGraphQLRequest (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/ApolloServer.ts:1056:30)","    at processTicksAndRejections (node:internal/process/task_queues:95:5)"]}}]}\n',
  body: {
    errors: [
      {
        message:
          "Context creation failed: passportSessionMiddleware is not defined",
        extensions: {
          code: "INTERNAL_SERVER_ERROR",
          stacktrace: [
            "ReferenceError: passportSessionMiddleware is not defined",
            "    at /Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:75:5",
            "    at new Promise (<anonymous>)",
            "    at Module.buildContext (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:60:9)",
            "    at context (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/initServer.ts:263:9)",
            "    at context (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/express4/index.ts:83:24)",
            "    at ApolloServer.executeHTTPGraphQLRequest (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/ApolloServer.ts:1056:30)",
            "    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
          ],
        },
      },
    ],
  },
  headers: {
    "x-powered-by": "Express",
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
    "content-length": "962",
    "etag": 'W/"3c2-e8BH7M3XoywUWHAC/6pSC+ODO1M"',
    "set-cookie": [
      "sessionId=s%3ARKrm6uSZ-QjW5QZLNiy78BkMD3oHlzdz.YEK0yUcE6ybpnu12dBKz4dJMCFgb%2FZXNILB2hNLQzfs; Path=/; Expires=Wed, 07 Jun 2124 01:23:48 GMT; HttpOnly",
    ],
    "date": "Mon, 01 Jul 2024 01:23:48 GMT",
    "connection": "close",
  },
  statusCode: 500,
  status: 500,
  statusType: 5,
  ok: false,
  clientError: false,
  serverError: true,
  error: {
    status: 500,
    text: '{"errors":[{"message":"Context creation failed: passportSessionMiddleware is not defined","extensions":{"code":"INTERNAL_SERVER_ERROR","stacktrace":["ReferenceError: passportSessionMiddleware is not defined","    at /Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:75:5","    at new Promise (<anonymous>)","    at Module.buildContext (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/context.ts:60:9)","    at context (/Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/lib/initServer.ts:263:9)","    at context (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/express4/index.ts:83:24)","    at ApolloServer.executeHTTPGraphQLRequest (file:///Users/erikpukinskis/x/outerframe/multiplayer-db-schema-service/node_modules/@apollo/server/src/ApolloServer.ts:1056:30)","    at processTicksAndRejections (node:internal/process/task_queues:95:5)"]}}]}\n',
    method: "POST",
    path: "/api",
  },
}
