// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { skipBlankLines } from "../src/commands/github-init.js";
import { relationshipFailureMessage } from "../src/commands/sync/persistence.js";
import { skipNonIntegerFactNumber } from "../src/traceability/temp-kb.js";
import { missingManifestActivation } from "../src/operations/bootstrap/activation.js";
import { writeOptionalStderr } from "../src/cli-json-command.js";
import { passingE2eStage } from "../src/public/impact/full-kb-quality.js";
import { filterSourceOnlySignals } from "../src/operations/bootstrap/generate.js";
import { stringLogicClaims } from "../src/operations/semantic-advisor/analyze-prose.js";
import { finishedAtPrecedesStartedAt } from "../src/public/proof-receipt.js";
import { isBehaviorSourceEdit } from "../src/traceability/staged-impact-contract.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("cli remasure11 leftover helpers", () => {
  test("covers extracted leftover helpers", () => {
    expect(skipBlankLines(["a", "", "", "b"], 1)).toBe(3);
    expect(skipBlankLines(["a", "b"], 2)).toBe(2);
    expect(relationshipFailureMessage(undefined, undefined)).toBe(
      "Unknown error",
    );
    expect(relationshipFailureMessage("single", "batch")).toBe("single");
    expect(relationshipFailureMessage(undefined, "batch")).toBe("batch");
    expect(skipNonIntegerFactNumber("value_int", 1.5)).toBe(true);
    expect(skipNonIntegerFactNumber("value_int", 2)).toBe(false);
    expect(skipNonIntegerFactNumber("value_number", 1.5)).toBe(false);
    expect(
      isBehaviorSourceEdit({
        path: "src/app.ts",
        intersectsBehaviorBearingSymbol: true,
        knownUserFacingSurface: false,
        diffText: "",
      }),
    ).toBe(false);
    expect(missingManifestActivation(true, false).activationState).toBe(
      "vendored_only",
    );
    expect(missingManifestActivation(false, true).activationState).toBe(
      "root_uninitialized",
    );
    expect(passingE2eStage({ ok: true })).toEqual({ ok: true });
    expect(passingE2eStage(["nope"])).toBeUndefined();
    const writes: string[] = [];
    const write = process.stderr.write;
    process.stderr.write = ((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      writeOptionalStderr(undefined);
      writeOptionalStderr("err\n");
    } finally {
      process.stderr.write = write;
    }
    expect(writes).toEqual(["err\n"]);
    expect(
      filterSourceOnlySignals(
        [
          { kind: "req" } as never,
          { kind: "test" } as never,
        ],
        ["req"],
      ).map((signal) => signal.kind),
    ).toEqual(["req"]);
    expect(filterSourceOnlySignals([{ kind: "req" } as never], []).length).toBe(
      1,
    );
    expect(stringLogicClaims(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(stringLogicClaims("nope")).toEqual([]);
    expect(finishedAtPrecedesStartedAt(10, 9)).toBe(true);
    expect(finishedAtPrecedesStartedAt(10, 11)).toBe(false);
    expect(finishedAtPrecedesStartedAt(null, 9)).toBe(false);
  });
});
