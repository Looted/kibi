import { describe, expect, test } from "bun:test";
import {
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import { SOURCE_READERS } from "../../src/public/proof-sources.js";

// implements REQ-kibi-source-proof-kinds

/**
 * The source readers Kibi accepts are exactly the reader enum the entity
 * schema publishes. The source certificate leaves the read to Kibi, which
 * reads that enum from entity.schema.json itself and checks it against the
 * set fact naming the eight readers.
 */
function sourceReadersCertificate() {
  return sourceCertificate({ testId: "TEST-kibi-source-proof-kinds-readers" });
}

describe("source proof readers, proved by a source certificate", () => {
  test("the schema's reader enum is the set of readers Kibi implements", async () => {
    writeCodeCertificate(sourceReadersCertificate());
    const read = await readProjectSource(
      {
        reader: "json",
        file: "packages/cli/src/schemas/entity.schema.json",
        path: "/properties/proof_contract/properties/source/properties/reader/enum",
        select: "items",
      },
      `${import.meta.dir}/../../../..`,
    );
    expect([...read.members].sort()).toEqual([...SOURCE_READERS].sort());
  });
});
