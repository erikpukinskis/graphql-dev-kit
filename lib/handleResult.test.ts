import { describe, expect, it } from "vitest"
import { CONTEXT_CREATION_FAILED } from "~/fixtures/CONTEXT_CREATION_FAILED"
import { extractDataOrErrors, isGraphQLError } from "~/handleResult"

describe("handleResult", () => {
  it("extracts GraphQL error if context creation fails", async () => {
    const { errors } = await extractDataOrErrors(CONTEXT_CREATION_FAILED)

    expect(errors).toHaveLength(1)

    const [error] = errors ?? []
    if (!error) {
      throw new Error("expected a GraphQL error")
    }

    if (!isGraphQLError(error)) {
      throw new Error("expected a GraphQL error")
    }

    expect(error.locations).toHaveLength(0)
    expect(isGraphQLError(error)).toBe(true)
  })
})
