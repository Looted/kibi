// implements REQ-skillopt-external-adoption-verdict
import { describe, expect, test } from "bun:test";
import {
  VerificationHarnessOptionsError,
  hasTraversal,
  parseVerificationHarnessCli,
} from "../verification-harness-options";

const RUN_ID = "123e4567-e89b-12d3-a456-426614174000";

function argv(
  overrides: Record<string, string> = {},
): string[] {
  const values = {
    skill: "kibi-usage",
    "run-id": RUN_ID,
    "artifact-root": "/tmp/artifacts",
    "target-root": "/tmp/target",
    "root-authorization": "/tmp/auth",
    "prepared-root": "/tmp/prepared",
    "preflight-receipt": "/tmp/preflight.json",
    "verification-parent": "/tmp/parent",
    output: "/tmp/out.json",
    ...overrides,
  };
  return Object.entries(values).flatMap(([key, value]) => [`--${key}`, value]);
}

describe("verification harness CLI options", () => {
  test("detects traversal segments", () => {
    expect(hasTraversal("/tmp/safe")).toBe(false);
    expect(hasTraversal("/tmp/../escape")).toBe(true);
  });

  test("parses a complete argument vector", () => {
    expect(parseVerificationHarnessCli(argv())).toEqual({
      skill: "kibi-usage",
      runId: RUN_ID,
      artifactRoot: "/tmp/artifacts",
      targetRoot: "/tmp/target",
      rootAuthorization: "/tmp/auth",
      preparedRoot: "/tmp/prepared",
      preflightReceipt: "/tmp/preflight.json",
      verificationParent: "/tmp/parent",
      output: "/tmp/out.json",
    });
  });

  test("rejects arity, unknown flags, duplicates, and traversal", () => {
    expect(() => parseVerificationHarnessCli(["--skill"])).toThrow(
      VerificationHarnessOptionsError,
    );
    const missingDash = argv();
    missingDash[0] = "skill";
    expect(() => parseVerificationHarnessCli(missingDash)).toThrow(
      "cli-arguments",
    );
    expect(() =>
      parseVerificationHarnessCli(argv({ skill: "not-a-skill" })),
    ).toThrow();
    const unknown = argv();
    unknown[0] = "--nope";
    expect(() => parseVerificationHarnessCli(unknown)).toThrow("cli-arguments");
    const duplicate = argv();
    duplicate[16] = "--skill";
    duplicate[17] = "kibi-freshness";
    expect(() => parseVerificationHarnessCli(duplicate)).toThrow(
      "cli-arguments",
    );
    expect(() =>
      parseVerificationHarnessCli(argv({ output: "/tmp/../out.json" })),
    ).toThrow("path-traversal");
  });
});
