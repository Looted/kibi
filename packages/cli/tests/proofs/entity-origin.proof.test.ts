import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import { ENTITY_ORIGIN_KINDS } from "../../src/public/entity-origin.js";
import { ENTITY_TYPES } from "../../src/public/operations/specs/mutation-schemas.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import entitySchema from "../../src/public/schemas/entity.js";

// implements REQ-kibi-entity-origin

const validate = new Ajv({ strict: false, allErrors: true }).compile(
  entitySchema,
);

function entity(type: string, origin?: unknown): Record<string, unknown> {
  return {
    id: `${type.toUpperCase()}-ORIGIN`,
    type,
    title: `${type} with an origin`,
    status: type === "req" ? "open" : "active",
    created_at: "2026-10-24T00:00:00.000Z",
    updated_at: "2026-10-24T00:00:00.000Z",
    source: `fixtures/${type}.md`,
    ...(origin === undefined ? {} : { origin }),
  };
}

function accepts(value: Record<string, unknown>): boolean {
  return validate(value) === true;
}

/** Every entity type accepts every origin kind with its optional fields and rejects unknown kinds and fields: the exhaustive certificate. */
async function entityOriginCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-kibi-entity-origin-exhaustive",
    domain: {
      symbolId: "SYM-mutation-entity-types-schema",
      members: ENTITY_TYPES,
    },
    check(type) {
      if (!accepts(entity(type)))
        throw new Error(
          `the entity without an origin is rejected: ${JSON.stringify(validate.errors)}`,
        );
      for (const kind of ENTITY_ORIGIN_KINDS) {
        for (const origin of [
          { kind },
          {
            kind,
            ref: "docs/decision.md",
            approved_by: "A person",
            recorded_at: "2026-10-24T00:00:00.000Z",
          },
        ])
          if (!accepts(entity(type, origin)))
            throw new Error(
              `origin ${JSON.stringify(origin)} is rejected: ${JSON.stringify(validate.errors)}`,
            );
      }
      if (accepts(entity(type, { kind: "robot" })))
        throw new Error("an unknown origin kind is accepted");
      if (accepts(entity(type, { kind: "human", signed_by: "A person" })))
        throw new Error("an unknown origin field is accepted");
      if (accepts(entity(type, { ref: "docs/decision.md" })))
        throw new Error("an origin without a kind is accepted");
    },
  });
}

describe("entity origin, proved by exhaustion", () => {
  test("every entity type accepts every origin kind with its optional fields and rejects unknown kinds and fields", async () => {
    const certificate = await entityOriginCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});
