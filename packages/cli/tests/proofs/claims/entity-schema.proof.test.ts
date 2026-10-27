import { describe, expect, test } from "bun:test";
import {
  arithmeticCertificate,
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-004

/**
 * The entity schema is the one place Kibi declares the entity model, so the
 * claims about entity types and entity fields are proved against it: Kibi
 * reads the schema itself at ingest and checks each claim's fact.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;
const SCHEMA = "packages/cli/src/schemas/entity.schema.json";

const ENTITY_TYPES: SourceSpec = {
  reader: "json",
  file: SCHEMA,
  path: "/properties/type/enum",
  select: "items",
};

/** The KB schema supports exactly eight typed entities. */
export async function entityTypeCountCertificate(): Promise<CodeCertificate> {
  const read = await readProjectSource(ENTITY_TYPES, WORKSPACE);
  return arithmeticCertificate({
    testId: "TEST-proof-entity-type-count",
    variable: "entity_type_count",
    valueType: "int",
    assumptions: [{ operator: "eq", value: read.members.length }],
    claim: { operator: "eq", value: 8 },
  });
}

/** Every entity record requires id, type, title, status, created_at, updated_at and source. */
export function entityRequiredFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-entity-required-fields" });
}

/** Entity records also accept priority, tags, owner and links. */
export function entityAcceptedFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-entity-accepted-fields" });
}

describe("entity schema claims", () => {
  test("the schema declares exactly eight entity types", async () => {
    const certificate = await entityTypeCountCertificate();
    writeCodeCertificate(certificate);
    expect(certificate.assumptions).toEqual([{ operator: "eq", value: 8 }]);
  });

  test("the schema requires the record fields", async () => {
    writeCodeCertificate(entityRequiredFieldsCertificate());
    const read = await readProjectSource(
      { reader: "json", file: SCHEMA, path: "/required", select: "items" },
      WORKSPACE,
    );
    expect([...read.members].sort()).toEqual(
      ["created_at", "id", "source", "status", "title", "type", "updated_at"],
    );
  });

  test("the schema accepts the optional record fields", async () => {
    writeCodeCertificate(entityAcceptedFieldsCertificate());
    const read = await readProjectSource(
      { reader: "json", file: SCHEMA, path: "/properties", select: "keys" },
      WORKSPACE,
    );
    for (const field of ["priority", "tags", "owner", "links"])
      expect(read.members).toContain(field);
  });
});
