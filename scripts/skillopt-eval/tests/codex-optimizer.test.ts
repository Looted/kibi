import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CodexOptimizerError,
  parseCodexOptimizerBody,
  persistCodexOptimizerBody,
} from "../runtime/codex-optimizer";

const REQUIRED_GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_check",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
  "fact_kind: predicate",
  "predicate_name",
  "predicate_args",
  "canonical_key",
  "polarity",
  "predicate_schema",
  "requires_predicate",
  "logic_claims",
  "claim_key",
  "claim_text",
  "logic-coverage",
].join("\n");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Codex optimizer output", () => {
  test("parses the dedicated final message as a complete replacement body", () => {
    const body = `# Kibi Usage\n\n${REQUIRED_GUIDANCE}\n\n${"Operational guidance. ".repeat(60)}`;

    expect(parseCodexOptimizerBody(JSON.stringify({ body }))).toBe(body);
  });

  test("rejects a structured progress note before it can become a candidate", () => {
    expect(() =>
      parseCodexOptimizerBody(
        JSON.stringify({
          body: "I’m using the Kibi Usage guidance to prepare the replacement.",
        }),
      ),
    ).toThrow(
      new CodexOptimizerError("optimizer_output_incomplete_body").message,
    );
  });

  test("rejects malformed or unsafe final output", () => {
    expect(() => parseCodexOptimizerBody("not-json")).toThrow(
      "optimizer_output_missing_body",
    );
    expect(() =>
      parseCodexOptimizerBody(
        JSON.stringify({
          body: `${REQUIRED_GUIDANCE}\nRead .kb directly.\n${"x".repeat(1_000)}`,
        }),
      ),
    ).toThrow("candidate_direct_kb_guidance");
  });

  test("rejects repository release policy and optimizer-corpus leakage", () => {
    for (const leaked of [
      "Run bun run version-packages before release.",
      "Merge the `develop` branch into `master`.",
      "Public training trajectories should be appended here.",
      "Use kibi-usage-fact-predicate-modeling-train-1 as the example.",
      "Apply this to the publishable package set.",
    ]) {
      expect(() =>
        parseCodexOptimizerBody(
          JSON.stringify({
            body: `# Kibi Usage\n\n${REQUIRED_GUIDANCE}\n\n${leaked}\n\n${"Portable guidance. ".repeat(60)}`,
          }),
        ),
      ).toThrow("optimizer_output_repository_policy_leak");
    }
  });

  test("persists an accepted body outside the ephemeral optimizer workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-optimizer-output-"));
    roots.push(root);
    const artifactRoot = join(root, "artifacts");
    const body = `# Kibi Usage\n\n${REQUIRED_GUIDANCE}\n\n${"Operational guidance. ".repeat(60)}`;

    await persistCodexOptimizerBody(artifactRoot, join(root, "source"), {
      runId: "00000000-0000-4000-8000-000000000001",
      skill: "kibi-usage",
      step: 1,
      body,
    });

    expect(
      await readFile(
        join(artifactRoot, "accepted-output", "candidate-body.md"),
        "utf8",
      ),
    ).toBe(body);
    const receipt = JSON.parse(
      await readFile(
        join(artifactRoot, "accepted-output", "receipt.json"),
        "utf8",
      ),
    );
    expect(receipt).toMatchObject({
      artifactType: "skillopt-accepted-optimizer-output",
      bodyBytes: Buffer.byteLength(body, "utf8"),
      step: 1,
    });
  });
});
