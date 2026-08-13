import { describe, expect, test } from "bun:test";
import { loadOperationSpec } from "../src/cli-operation-loader.js";
import { CLI_OPERATION_METADATA } from "../src/cli-operation-metadata.js";
import { OPERATION_CATALOG } from "../src/public/operations/catalog.js";

// executable_for TEST-test-journaled-engine-harness
describe("lightweight CLI operation metadata", () => {
  test("matches the authoritative public operation catalog", () => {
    const lightweight: readonly {
      readonly name: string;
      readonly cliName: string;
      readonly description: string;
    }[] = CLI_OPERATION_METADATA;
    const authoritative = OPERATION_CATALOG.map(
      ({ name, cliName, description }) => ({
        name,
        cliName,
        description,
      }),
    );
    expect(lightweight).toEqual(authoritative);
  });

  test("loads the matching implementation for every operation", async () => {
    for (const authoritative of OPERATION_CATALOG) {
      const loaded = await loadOperationSpec(authoritative.name);
      expect(loaded).toBe(authoritative);
    }
  });
});
