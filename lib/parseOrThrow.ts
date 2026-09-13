import type {
  z,
  ZodDiscriminatedUnion,
  ZodIssue,
  ZodObject,
  ZodRawShape,
  ZodUnion,
} from "zod"
import { ZodError } from "zod"

/**
 * Parse an object using a Zod schema, and if parsing fails throw a nice error
 * message. Unlike the default Zod error messages, it:
 *
 *  - Indicates something about what the app was doing when parsing failed
 *  - Only reports a single validation error, even if there are many
 *  - Tries to be as specific as possible while also being concise.
 */
export function parseOrThrow<
  SchemaType extends
    | ZodObject<ZodRawShape>
    | ZodUnion<[ZodObject<ZodRawShape>, ...ZodObject<ZodRawShape>[]]>
    | ZodDiscriminatedUnion<
        string,
        [ZodObject<ZodRawShape>, ...ZodObject<ZodRawShape>[]]
      >
>(schema: SchemaType, data: unknown, message: string): z.infer<SchemaType> {
  try {
    return schema.parse(data)
  } catch (error) {
    console.error(`Data: ${JSON.stringify(data, null, 4)}`)
    if (error instanceof ZodError) {
      const [issue] = error.issues
      if (message.endsWith(".")) {
        message = message.slice(0, -1)
      }

      if (issue.code === "invalid_union") {
        const [
          {
            issues: [unionIssue],
          },
        ] = issue.unionErrors

        throw new Error(`${message}. ${describeIssue(unionIssue) ?? ""}`)
      } else {
        throw new Error(`${message}. ${describeIssue(issue) ?? ""}`)
      }
    }
    throw error
  }
}

function describeIssue(issue?: ZodIssue) {
  if (!issue) return undefined
  if (issue.code === "invalid_union") return undefined
  if (issue.path.length < 1) return undefined

  const location = issue.path.join(".")
  let received = ""

  switch (issue.code) {
    case "invalid_enum_value":
    case "invalid_literal":
      received = ` received ${JSON.stringify(issue.received)}`
  }

  return `Zod validation failed at .${location}: ${issue.message}${received}`
}
