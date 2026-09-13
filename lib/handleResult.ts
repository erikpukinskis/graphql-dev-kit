import type { DocumentNode, SourceLocation } from "graphql"
import { isRecord } from "./isRecord"
import { parseGraphqlData } from "./parseGraphqlData"

Error.stackTraceLimit = 20

type Location = {
  line: number
  column: number
}

export type GraphQLError = {
  message: string
  locations: Location[]
  extensions: {
    code: string
    operation?: {
      source: string
    }
    stacktrace: string[]
  }
  originalError?: Error
}

export function isGraphQLError(e: unknown): e is GraphQLError {
  if (!isRecord(e)) return false
  if (typeof e.message !== "string") return false
  if (!Array.isArray(e.locations)) return false
  if (!isRecord(e.extensions)) return false
  return true
}

type NetworkError = Error & {
  networkError: {
    result: {
      errors: GraphQLError[]
    }
  }
}

function isNetworkError(error: unknown): error is NetworkError {
  if (!isRecord(error)) return false
  if (!isRecord(error.networkError)) return false
  if (!isRecord(error.networkError.result)) return false
  return Array.isArray(error.networkError.result.errors)
}

type ResolverError = Error & {
  graphQLErrors: [GraphQLError]
}

function isResolverError(error: unknown): error is ResolverError {
  if (!isRecord(error)) return false
  return Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0
}

type Result<Data extends Record<string, unknown>> = {
  data?: Data | null | undefined
  errors?: readonly GraphQLError[]
}

type ErrorResponse = { status: number; error: Error }

function isErrorResponse(result: unknown): result is ErrorResponse {
  if (!isRecord(result)) return false
  return result.error instanceof Error
}

export type ResponseWithBody = { body: Record<string, unknown> }

function isResponseWithBodyOrErrors(
  result: unknown
): result is ResponseWithBody {
  if (!isRecord(result)) return false
  const body = result.body

  if (!isRecord(body)) return false
  if (Object.keys(body).length < 1) return false

  return true
}

export async function handleResult(
  result: ResponseWithBody
): Promise<{ data: Record<string, unknown> }> {
  const spareError = new Error("Spare Error")
  const callStack = spareError.stack
  try {
    const { data, errors } = await extractDataOrErrors(result)

    if (errors) {
      const [error] = errors

      if (!error) {
        throw new Error("GraphQL response had no data and zero errors?")
      }

      if (!isGraphQLError(error)) {
        console.log("ya not a gql one")
        throw error
      }

      const { extensions, message, locations } = error
      const stacktrace = Array.isArray(extensions.stacktrace)
        ? extensions.stacktrace.filter((line) => typeof line === "string")
        : []
      const stack = stacktrace.join("\n")

      throw buildError(
        message,
        extensions.operation?.source,
        locations[0],
        stack
      )
    }
    return { data }
  } catch (e) {
    if (isNetworkError(e)) {
      const [networkGraphqlError] = e.networkError.result.errors
      if (!networkGraphqlError) {
        throw e
      }
      const { extensions, locations, originalError, message } =
        networkGraphqlError
      const stack = originalError ? originalError.stack : callStack
      throw buildError(
        message,
        extensions.operation?.source,
        locations[0],
        stack
      )
    } else if (isResolverError(e)) {
      const [resolverGraphqlError] = e.graphQLErrors
      if (!resolverGraphqlError) {
        throw e
      }
      const { extensions, locations, message } = resolverGraphqlError
      throw buildError(
        message,
        extensions.operation?.source,
        locations[0],
        callStack
      )
    } else {
      throw e
    }
  }
}

type DataOrErrors<T extends Record<string, unknown>> =
  | {
      data: undefined
      errors: Array<GraphQLError | Error>
    }
  | {
      data: T
      errors: undefined
    }

export async function extractDataOrErrors<T extends Record<string, unknown>>(
  result: ResponseWithBody | Promise<Result<T>>
): Promise<DataOrErrors<T>> {
  let data: Record<string, unknown> | undefined
  let errors: Readonly<Array<GraphQLError | Error>> | undefined
  let raw: unknown | undefined

  if (isResponseWithBodyOrErrors(result)) {
    raw = result.body
    data = readData(result.body.data)
    errors = readErrors(result.body.errors)

    if (!data && !errors) {
      console.log("BODY", JSON.stringify(result.body, null, 4))
      throw new Error("Response body was JSON, but it had no data or errors")
    }
  } else if (isErrorResponse(result)) {
    errors = [result.error]
  } else {
    const awaited = await result
    raw = awaited
    data = awaited.data ?? undefined
    errors = awaited.errors
  }

  if (!data) {
    if (!errors) {
      console.log("RESULT", JSON.stringify(raw, null, 4))
      throw new Error("GraphQL result had no data or errors?")
    }

    const [error] = errors

    if (!error) {
      console.log("RESULT", JSON.stringify(raw, null, 4))
      throw new Error("GraphQL response had no data and zero errors?")
    }

    const normalized: Array<GraphQLError | Error> = []
    for (const item of errors) {
      normalized.push(normalizeGraphqlError(item))
    }

    return { errors: normalized, data: undefined }
  }

  if (typeof data !== "object") {
    console.log("RESULT", JSON.stringify(raw, null, 4))
    throw new Error(
      `Received GraphQL response data that was an ${typeof data} instead of JSON?`
    )
  }

  return { data: parseGraphqlData<T>(data), errors: undefined }
}

function readData(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) return undefined
  return value
}

function readErrors(value: unknown): Array<GraphQLError | Error> | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return undefined
  return value.map(normalizeGraphqlError)
}

function normalizeGraphqlError(error: unknown): GraphQLError | Error {
  if (error instanceof Error) return error
  if (!isRecord(error)) return new Error("Unknown GraphQL error")

  const extensions = error.extensions
  if (isRecord(extensions) && typeof extensions.code === "string") {
    if (!error.locations) {
      error.locations = []
    }
  }

  if (isGraphQLError(error)) return error
  if (typeof error.message === "string") return new Error(error.message)
  return new Error("Unknown GraphQL error")
}

function buildError(
  message: string,
  operationSource: string | DocumentNode | undefined,
  location: SourceLocation | undefined,
  stack: string | undefined,
  filename?: string
) {
  let annotatedQuery
  if (operationSource && location) {
    annotatedQuery = annotateSource(operationSource, location, filename)
  } else if (message.startsWith("Context creation failed")) {
    annotatedQuery =
      "\n(Cannot show location of error in GraphQL source because ApolloServer does not provide a way to grab the query when context creation fails.)\n"
  } else {
    annotatedQuery =
      "\n(Cannot show location of error in GraphQL source because no query was found in the error extensions. Did you install the IncludeQueryOnErrorPlugin in your ApolloServer instance?)\n"
  }
  stack = stack?.split("\n").slice(1).join("\n")
  const error = `${message}\n${annotatedQuery ? `${annotatedQuery}\n` : ""}${
    stack ?? ""
  }\n`
  return new Error(error)
}

function annotateSource(
  source: string | DocumentNode,
  location: SourceLocation,
  filename?: string
) {
  const lines = documentToString(source).split("\n")
  const errorLineNumber = location.line
  const column = location.column - 1
  let outputStart = Math.max(0, errorLineNumber - 4)
  if (outputStart < 3) {
    outputStart = 0
  }
  const outputEnd = Math.min(lines.length, errorLineNumber + 4)
  const numberWidth = Math.log10(lines.length)

  const line = lines[errorLineNumber - 1]
  if (line !== undefined) {
    lines[errorLineNumber - 1] =
      line.substr(0, column) +
      "[[[ ERROR OCCURRED HERE ]]]" +
      line.substr(column)
  }

  const output = lines.slice(outputStart, outputEnd).map((outputLine, i) => {
    const lineNumber = outputStart + i + 1
    const padded = lineNumber.toString().padStart(numberWidth, " ")
    const symbol = lineNumber === errorLineNumber ? ">" : " "
    return `${symbol} ${padded} | ${outputLine}`
  })

  if (outputStart > 1) {
    output.unshift("    ...".padStart(numberWidth, " "))
  }

  if (outputStart > 0) {
    const lineNumber = 1
    const padded = lineNumber.toString().padStart(numberWidth, " ")
    output.unshift(`  ${padded} | ${lines[0]}`)
  }

  return `${filename || "GraphQL Query:"}\n\n${output.join("\n")}`
}

function documentToString(document: DocumentNode | string) {
  const query =
    typeof document === "string" ? document : document.loc?.source.body
  if (!query) throw new Error("Couldn't get query off DocumentNode")

  const lines = query.split("\n").filter((line) => !/^ *$/.test(line))

  let minIndent: number | undefined
  lines.forEach((line) => {
    if (line.match(/^ *$/)) return
    const match = line.match(/^ */)
    if (!match) throw new Error("This is impossible")
    const indent = match[0].length
    if (minIndent === undefined) {
      minIndent = indent
    } else if (indent < minIndent) {
      minIndent = indent
    }
  })

  return lines
    .map((line) => {
      const deindented = line.slice(minIndent)
      return deindented
        .replace(/^mutation\(/, "mutation (")
        .replace(/^query\(/, "query (")
    })
    .join("\n")
}
