import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

type Step = {
  name?: string;
  id?: string;
  if?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
};
type Job = {
  needs?: string[];
  if?: string;
  env?: Record<string, string>;
  strategy?: { "fail-fast"?: boolean; matrix?: { shard?: number[] } };
  steps: Step[];
};

const workflow = Bun.YAML.parse(
  readFileSync(join(ROOT, ".github", "workflows", "proof.yml"), "utf8"),
) as { jobs: Record<string, Job> };
const shards = workflow.jobs.prove as Job;
const proof = workflow.jobs.proof as Job;
const step = (job: Job, name: string) => {
  const found = job.steps.find((candidate) => candidate.name === name);
  expect(found, name).toBeDefined();
  return found as Step;
};

describe("the proof workflow splits kibi prove --all over shards", () => {
  test("each shard proves its K-th of N parts and saves what it changed", () => {
    const count = shards.strategy?.matrix?.shard?.length ?? 0;
    expect(count).toBeGreaterThan(1);
    expect(shards.strategy?.matrix?.shard).toEqual(
      Array.from({ length: count }, (_, index) => index + 1),
    );
    // One failed shard cancels the rest instead of finishing a doomed run.
    expect(shards.strategy?.["fail-fast"]).toBe(true);
    expect(shards.env?.KIBI_PROOF_SHARD).toBe(`\${{ matrix.shard }}/${count}`);
    const prove = step(
      shards,
      "Prove this shard's part of the contracted tests",
    );
    expect(prove.id).toBe("prove");
    expect(prove.run).toContain(
      'kibi prove --all --shard "$KIBI_PROOF_SHARD" --list > "$out/list.json"',
    );
    expect(prove.run).toContain(
      'kibi prove --all --shard "$KIBI_PROOF_SHARD" | tee "$out/prove.log"',
    );
    expect(prove.run).toContain(
      'bun scripts/ci-proof-shards.ts collect "$out"',
    );
    const upload = step(shards, "Upload this shard's receipts");
    expect(upload.with).toMatchObject({
      name: "kibi-proof-shard-${{ matrix.shard }}",
      "include-hidden-files": true,
      "if-no-files-found": "error",
    });
  });

  test("the proof job gates only after the shards add up to one full run", () => {
    expect(proof.needs).toContain("prove");
    const names = proof.steps.map((candidate) => candidate.name);
    const download = step(proof, "Download the proof shards' receipts");
    expect(download.with).toMatchObject({
      pattern: "kibi-proof-shard-*",
      path: "${{ runner.temp }}/kibi-proof-shards",
    });
    const join = step(proof, "Prove every contracted test through Kibi");
    expect(join.env?.KIBI_PROOF_SHARDS).toBe(
      "${{ runner.temp }}/kibi-proof-shards",
    );
    expect(join.env?.KIBI_PROOF_SHARDS_RESULT).toBe(
      "${{ needs.prove.result }}",
    );
    const run = String(join.run);
    const order = [
      '[ "$KIBI_PROOF_SHARDS_RESULT" != success ]',
      'kibi prove --all --list > "$all"',
      'bun scripts/ci-proof-shards.ts join "$KIBI_PROOF_SHARDS" "$all"',
      "bun packages/cli/bin/kibi sync",
    ].map((part) => run.indexOf(part));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(names.indexOf("Download the proof shards' receipts")).toBeLessThan(
      names.indexOf("Prove every contracted test through Kibi"),
    );
    expect(
      names.indexOf("Prove every contracted test through Kibi"),
    ).toBeLessThan(
      names.indexOf("Enforce evidence floors on a clean snapshot"),
    );
  });
});
