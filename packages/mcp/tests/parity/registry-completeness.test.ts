import { describe, expect, test } from "bun:test";

import { PARITY_CASES } from "../../../cli/tests/parity/cases.js";

describe("parity registry completeness", () => {
  test("contains exactly one completed parity case for every catalog operation", async () => {
    const { listSpecs } = await import("kibi-cli/operations");
    const specs = listSpecs();
    const counts = new Map<string, number>();
    for (const parityCase of PARITY_CASES) {
      counts.set(
        parityCase.operation,
        (counts.get(parityCase.operation) ?? 0) + 1,
      );
    }

    expect(specs).toHaveLength(21);
    expect(PARITY_CASES).toHaveLength(21);
    for (const spec of specs) {
      expect(
        counts.get(spec.name),
        `missing or duplicate parity case: ${spec.name}`,
      ).toBe(1);
    }
    expect([...counts.keys()].sort()).toEqual(
      specs.map(({ name }) => name).sort(),
    );
  });
});
