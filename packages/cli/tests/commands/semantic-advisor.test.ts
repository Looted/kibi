import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const BIN = path.resolve(import.meta.dir, "../../bin/kibi");

describe("semantic-advisor --input", () => {
  test("accepts exact MCP-shaped JSON and rejects blank text", async () => {
    // Given: one valid and one invalid JSON input file.
    const root = await mkdtemp(
      path.join(os.tmpdir(), "kibi-semantic-command-"),
    );
    const validPath = path.join(root, "valid.json");
    const invalidPath = path.join(root, "invalid.json");
    await writeFile(
      validPath,
      JSON.stringify({ text: "Customer data must be retained for 7 years." }),
    );
    await writeFile(invalidPath, JSON.stringify({ text: "   " }));

    try {
      // When: both inputs are sent through the dedicated command.
      const valid = Bun.spawnSync(
        ["bun", "run", BIN, "semantic-advisor", "--input", validPath],
        {
          cwd: root,
        },
      );
      const invalid = Bun.spawnSync(
        ["bun", "run", BIN, "semantic-advisor", "--input", invalidPath],
        { cwd: root },
      );

      // Then: success is JSON-only and invalid business input exits 2.
      expect(valid.exitCode, valid.stderr.toString()).toBe(0);
      expect(
        JSON.parse(valid.stdout.toString()).data.receipt.suggestions[0],
      ).toMatchObject({
        kind: "strict_property",
        claim: { property_key: "retention_years", value_int: 7 },
      });
      expect(invalid.exitCode).toBe(2);
      const invalidEnvelope = JSON.parse(invalid.stdout.toString());
      expect(invalidEnvelope).toMatchObject({
        kibiProtocol: 1,
        operation: "kb_semantic_advisor",
        status: "error",
        error: { code: "VALIDATION_FAILED", retryable: false },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
