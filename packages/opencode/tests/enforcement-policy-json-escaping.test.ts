import { describe, expect, test } from "bun:test";
import { computeEnforcementPolicy } from "../src/enforcement-policy";

describe("enforcement policy advisory snippets", () => {
  test("JSON-escapes edited source paths in kb_check guidance", () => {
    const sourcePath = 'src/quoted"name.ts';
    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: sourcePath, lifecycle: "edited" }],
      pathKinds: ["code"],
      posture: "root_active",
    });

    expect(result.kind).toBe("advisory_guidance");
    expect(result.text).toContain(
      `sourceFiles:${JSON.stringify([sourcePath])}`,
    );
  });
});
