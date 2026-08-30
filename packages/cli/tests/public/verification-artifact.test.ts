import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  PLAYWRIGHT_RUN_ARTIFACT_SCHEMA,
  PLAYWRIGHT_RUN_CASE_OUTCOMES,
  PLAYWRIGHT_RUN_VERSION,
  VERIFICATION_CASE_ARTIFACT_SCHEMA,
  playwrightRunArtifactErrors,
  verificationCaseArtifactErrors,
} from "../../src/public/verification-artifact.js";
import { ingestVerificationSpec } from "../../src/public/operations/specs/verification.js";
import { KibiPlaywrightReporter } from "../../src/verification/playwright-reporter.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EXAMPLES_DIR = join(repoRoot, "docs/examples/verification");
const SKILL_RESOURCE = join(
  repoRoot,
  "packages/cli/src/public/skills/kibi-usage/resources/proof-verification.md",
);

function validArtifact(): Record<string, unknown> {
  return {
    version: PLAYWRIGHT_RUN_VERSION,
    runner: "playwright",
    command_argv: ["node", "scripts/run-proof-contract.mjs"],
    code_snapshot: "a".repeat(64),
    environment_hash: "b".repeat(64),
    started_at: "2026-08-29T12:00:00.000Z",
    finished_at: "2026-08-29T12:00:01.000Z",
    process_exit_code: 0,
    cases: [
      {
        symbol_id: "SYM-e2e-packed-example",
        project: "default",
        outcome: "passed",
        retries: 0,
        duration_ms: 100,
      },
    ],
  };
}

describe("verification artifact schema module", () => {
  test("accepts a valid artifact with no errors", () => {
    expect(playwrightRunArtifactErrors(validArtifact())).toEqual([]);
  });

  test("reports all problems at once with expected vs received", () => {
    const errors = playwrightRunArtifactErrors({
      version: "nope",
      runner: "",
      command_argv: [],
      code_snapshot: "xyz",
      environment_hash: "dev",
      started_at: "",
      finished_at: "",
      process_exit_code: "zero",
      cases: [],
    });
    expect(errors.length).toBe(9);
    expect(errors.join("\n")).toContain(
      "artifact.version must be kibi.playwright-run.v1; received \"nope\"",
    );
    expect(errors.join("\n")).toContain(
      "artifact.code_snapshot must be the 64-hex workspace snapshot",
    );
    expect(errors.join("\n")).toContain(
      "artifact.cases must be a non-empty array of case results",
    );
  });

  test("case outcome error lists allowed literals and received value", () => {
    const errors = verificationCaseArtifactErrors(
      {
        symbol_id: "SYM-x",
        project: "default",
        outcome: "pass",
        retries: 0,
        duration_ms: 1,
      },
      "artifact.cases[0]",
    );
    expect(errors.join(" ")).toContain(
      "artifact.cases[0].outcome must be one of: passed, failed, timed_out, skipped, interrupted",
    );
    expect(errors.join(" ")).toContain('received "pass"');
  });

  test("case error names the missing shape for non-objects", () => {
    expect(verificationCaseArtifactErrors("passed", "artifact.cases[2]")[0]).toContain(
      "artifact.cases[2] must be an object with symbol_id, project, outcome, retries, and duration_ms",
    );
  });

  test("schema constants carry the nested case contract", () => {
    expect(PLAYWRIGHT_RUN_ARTIFACT_SCHEMA.properties.cases.items).toBe(
      VERIFICATION_CASE_ARTIFACT_SCHEMA,
    );
    expect(VERIFICATION_CASE_ARTIFACT_SCHEMA.required).toEqual([
      "symbol_id",
      "project",
      "outcome",
      "retries",
      "duration_ms",
    ]);
    expect(PLAYWRIGHT_RUN_CASE_OUTCOMES).toEqual([
      "passed",
      "failed",
      "timed_out",
      "skipped",
      "interrupted",
    ]);
  });
});

describe("kb_ingest_verification operation spec", () => {
  test("publishes the full nested artifact schema to MCP clients", () => {
    const artifact = ingestVerificationSpec.businessInputSchema.properties
      .artifact as Record<string, unknown>;
    expect(artifact).toBe(PLAYWRIGHT_RUN_ARTIFACT_SCHEMA);
    const cases = (artifact.properties as Record<string, unknown>).cases as Record<
      string,
      unknown
    >;
    const items = cases.items as Record<string, unknown>;
    expect(items.properties).toBeDefined();
    expect(
      (items.properties as Record<string, unknown>).outcome,
    ).toBeDefined();
    expect(
      (items.properties as Record<string, unknown>).symbol_id,
    ).toBeDefined();
  });

  test("description names the case fields, outcomes, and golden path", () => {
    expect(ingestVerificationSpec.description).toContain("symbol_id");
    expect(ingestVerificationSpec.description).toContain("kibi verify");
  });
});

describe("reporter artifact parity", () => {
  test("reporter output passes the shared artifact validator", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "kibi-verification-artifact-"));
    const artifactPath = join(tempDir, "artifact.json");
    try {
      const reporter = new KibiPlaywrightReporter({
        outputPath: artifactPath,
        codeSnapshot: "a".repeat(64),
        commandArgv: ["node", "scripts/run-proof-contract.mjs"],
        environmentHash: "b".repeat(64),
      });
      reporter.onBegin();
      reporter.onTestEnd(
        {
          titlePath: () => ["suite", "should checkout"],
          location: { file: "/repo/e2e/checkout.spec.ts", line: 10 },
          project: () => ({ name: "default" }),
        },
        { status: "passed", retry: 0, duration: 120 },
      );
      await reporter.onEnd({ status: "passed" });
      const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
      expect(playwrightRunArtifactErrors(artifact)).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("published example fixtures", () => {
  const files = readdirSync(EXAMPLES_DIR).filter((name) =>
    name.endsWith(".json"),
  );

  test("examples directory is non-empty", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test("every example validates structurally", () => {
    for (const name of files) {
      const artifact = JSON.parse(
        readFileSync(join(EXAMPLES_DIR, name), "utf8"),
      );
      expect(playwrightRunArtifactErrors(artifact)).toEqual([]);
    }
  });

  test("passing-proof examples use passed outcomes with exit code 0", () => {
    const passing = files.filter((name) => {
      const artifact = JSON.parse(
        readFileSync(join(EXAMPLES_DIR, name), "utf8"),
      ) as { process_exit_code?: number; cases?: Array<{ outcome?: string }> };
      return (
        artifact.process_exit_code === 0 &&
        (artifact.cases ?? []).every((row) => row.outcome === "passed")
      );
    });
    expect(passing.sort()).toEqual(["minimal-passing.json", "multi-project.json"]);
  });
});

describe("proof skill resource", () => {
  const body = readFileSync(SKILL_RESOURCE, "utf8");

  test("documents the current artifact version and outcome literals", () => {
    expect(body).toContain(PLAYWRIGHT_RUN_VERSION);
    for (const outcome of PLAYWRIGHT_RUN_CASE_OUTCOMES) {
      expect(body).toContain(`\`${outcome}\``);
    }
    expect(body).toContain("kibi verify");
  });
});
