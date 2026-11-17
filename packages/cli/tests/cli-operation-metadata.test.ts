import { describe, expect, test } from "bun:test";
import { loadOperationSpec } from "../src/cli-operation-loader.js";
import {
  CLI_OPERATION_METADATA,
  commandSummary,
  isOperationName,
} from "../src/cli-operation-metadata.js";
import { OPERATION_CATALOG } from "../src/public/operations/catalog.js";

// executable_for TEST-test-journaled-engine-harness
describe("lightweight CLI operation metadata", () => {
  test("a command summary is the first sentence of the description", () => {
    expect(commandSummary("First part. Second part.")).toBe("First part.");
    expect(commandSummary("  Ask it? Then more.")).toBe("Ask it?");
    expect(commandSummary("Stop! Now.")).toBe("Stop!");
    // A dot inside a version or name does not end the sentence.
    expect(commandSummary("Plan kibi.bootstrap-plan.v1 work. More.")).toBe(
      "Plan kibi.bootstrap-plan.v1 work.",
    );
    expect(commandSummary("Line one.\nLine two.")).toBe("Line one.");
    expect(commandSummary("No full stop")).toBe("No full stop");
    expect(commandSummary("Ends here.")).toBe("Ends here.");
    expect(commandSummary("One. Two. Three.")).toBe("One.");
    expect(commandSummary("Line one\ncontinues. More.")).toBe(
      "Line one\ncontinues.",
    );
    for (const { description } of CLI_OPERATION_METADATA) {
      const summary = commandSummary(description);
      expect(description.startsWith(summary)).toBe(true);
      expect(summary.length).toBeLessThanOrEqual(220);
    }
  });

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

  test("isOperationName accepts catalog names only", () => {
    for (const { name } of OPERATION_CATALOG)
      expect(isOperationName(name)).toBe(true);
    expect(isOperationName("kb_unknown")).toBe(false);
    expect(isOperationName("")).toBe(false);
  });
});
