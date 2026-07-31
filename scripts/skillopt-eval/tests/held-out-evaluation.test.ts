import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { evaluation } from "./held-out-evaluation-test-helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("held-out terminal evaluation", () => {
  test("evaluates all 96 physical cells through predicate, skill, and bundle gates", async () => {
    // Given
    const input = evaluation();
    roots.push(input.root);
    const module = await import("../held-out-evaluation");

    // When
    const result = module.evaluateHeldOutMatrix(input);

    // Then
    expect(result.eligibility).toBe("eligible");
    expect(result.evidenceId).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("predicate-held-out");
  });

  test("returns generic ineligibility when one physical cell is absent", async () => {
    // Given
    const input = evaluation();
    roots.push(input.root);
    const module = await import("../held-out-evaluation");

    // When
    const result = module.evaluateHeldOutMatrix({
      ...input,
      physicalCells: input.physicalCells.slice(0, -1),
    });

    // Then
    expect(result.eligibility).toBe("HELD_OUT_MATRIX_INELIGIBLE");
    expect(JSON.stringify(result)).not.toContain("predicate-held-out");
  });
});
