import { afterEach, describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { replayCodexEpisode } from "../runtime/codex-episode";
import { scoreCell } from "../scoring/cell";
import type { CellReceipt } from "../scoring/cell";
import {
  REANALYSIS_SOURCE_FILES,
  compareReceipt,
  hashReanalysisSourceFiles,
  runOfflineClassifierReanalysis,
  verifyArtifactRef,
} from "../screen-classifier-reanalysis";
import {
  evaluatorEvidence,
  evaluatorManifest,
  predicateSnapshot,
} from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
const REPO_ROOT = resolve(import.meta.dir, "../../..");

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const REQUEST = {
  schemaVersion: "1.0.0" as const,
  artifactType: "episode-request" as const,
  episodeId: "00000000-0000-4000-8000-000000000101",
  runId: "00000000-0000-4000-8000-000000000102",
  runLockHash: "a".repeat(64),
  variant: "skillopt" as const,
  skill: "kibi-usage" as const,
  taskId: "kibi-usage-fact-predicate-modeling-held-out-3",
  attempt: 1 as const,
  prompt: "Complete the public fixture task.",
  workspaceFixtureHash: "b".repeat(64),
};

const EVIDENCE = {
  brokerTrace: "broker\n",
  diagnosticReceipt: "diagnostic\n",
  finalState: "final-state\n",
} as const;

const TURN_COMPLETED = JSON.stringify({ type: "turn.completed" });

function latentScore(): CellReceipt {
  return scoreCell(
    evaluatorManifest("predicate"),
    evaluatorEvidence(
      predicateSnapshot({
        facts: [
          {
            id: "FACT-held-out-matrix",
            factKind: "predicate",
            predicateName: "held_out_matrix",
            predicateArgs: ["wrong", "args"],
            polarity: "deny",
            claimKey: "CLAIM-AAAAAAAAAAAAAAAA",
            claimText: "The matrix must deny changed candidate bytes.",
          },
        ],
      }),
    ),
  );
}

function receiptFor(
  score: CellReceipt,
  transcript: string,
): Awaited<ReturnType<typeof replayCodexEpisode>> {
  return replayCodexEpisode({
    request: REQUEST,
    transcript,
    stderr: "",
    exitCode: 0,
    termination: "exit",
    startedAt: "2026-09-11T10:00:00Z",
    finishedAt: "2026-09-11T10:00:01Z",
    evidence: EVIDENCE,
    score,
    hiddenMarkers: [],
    forbiddenRoots: [],
    pricingHash: "c".repeat(64),
    priceAmount: 0,
  });
}

describe("offline classifier receipt comparison", () => {
  test("corrects a direct-access false positive without changing the latent score", () => {
    const latent = latentScore();
    const receipt = receiptFor(
      latent,
      [
        JSON.stringify({
          type: "item.completed",
          item: { type: "command_execution", command: "cat .kb/usage.log" },
        }),
        TURN_COMPLETED,
      ].join("\n"),
    );

    const comparison = compareReceipt({
      receipt,
      latent,
      currentDirectKbAccess: false,
    });

    expect(comparison.oldDirectKbAccess).toBe(true);
    expect(comparison.correctedDirectKbAccess).toBe(false);
    expect(comparison.oldScore).toBe(0);
    expect(comparison.correctedScore).toBe(latent.score);
    expect(comparison.correctedHardPass).toBe(false);
    expect(comparison.correctedViolations).toEqual([]);
  });

  test("keeps a non-excluded direct access row at zero", () => {
    const latent = latentScore();
    const receipt = receiptFor(
      latent,
      [
        JSON.stringify({
          type: "item.completed",
          item: { type: "command_execution", command: "cat .kb/usage.log" },
        }),
        TURN_COMPLETED,
      ].join("\n"),
    );

    const comparison = compareReceipt({
      receipt,
      latent,
      currentDirectKbAccess: true,
    });

    expect(comparison.correctedScore).toBe(0);
    expect(comparison.correctedViolations).toEqual(["direct_kb_access"]);
  });

  test("preserves a row whose non-direct violation was already recorded", () => {
    const latent = latentScore();
    const receipt = receiptFor(
      latent,
      [
        JSON.stringify({
          type: "item.completed",
          item: { type: "file_change", changes: [{ path: "../PWNED" }] },
        }),
        TURN_COMPLETED,
      ].join("\n"),
    );

    const comparison = compareReceipt({
      receipt,
      latent,
      currentDirectKbAccess: false,
    });

    expect(comparison.oldScore).toBe(0);
    expect(comparison.correctedScore).toBe(0);
    expect(comparison.correctedViolations).toEqual(["forbidden_write"]);
  });

  test("rejects a saved original score mismatch", () => {
    const latent = latentScore();
    const receipt = receiptFor(latent, [TURN_COMPLETED].join("\n"));
    const mismatched = {
      ...receipt,
      result: { ...receipt.result, score: receipt.result.score + 1 },
    };

    expect(() =>
      compareReceipt({
        receipt: mismatched,
        latent,
        currentDirectKbAccess: false,
      }),
    ).toThrow("original_score_mismatch");
  });

  test("rejects an artifact hash mismatch before using its contents", async () => {
    const root = await mkdtemp(join(tmpdir(), "kibi-screen-reanalysis-hash-"));
    roots.push(root);
    const content = "saved evidence\n";
    await writeFile(join(root, "raw-host.jsonl"), content);
    const expected = createHash("sha256").update(content).digest("hex");

    await expect(
      verifyArtifactRef(root, "rawTranscript", {
        path: "raw-host.jsonl",
        sha256: `${expected.slice(0, -1)}0`,
      }),
    ).rejects.toThrow("artifact_ref_hash_mismatch");
  });

  test("blocks a worktree artifact root before creating it", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "kibi-screen-source-"));
    const fixtureRunRoot = await mkdtemp(
      join(tmpdir(), "kibi-screen-fixtures-"),
    );
    const artifactRoot = join(
      REPO_ROOT,
      `.kibi-screen-reanalysis-${randomUUID()}`,
    );
    roots.push(sourceRoot, fixtureRunRoot, artifactRoot);

    await expect(
      runOfflineClassifierReanalysis({
        sourceRoot,
        fixtureRunRoot,
        artifactRoot,
      }),
    ).rejects.toThrow("artifact_root_overlaps_source");
    await expect(lstat(artifactRoot)).rejects.toThrow("ENOENT");
  });

  test("blocks a symlinked source ancestor before reading an artifact", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "kibi-screen-source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "kibi-screen-target-"));
    const linkedRoot = join(sourceRoot, "episodes");
    const artifactPath = join(targetRoot, "raw-host.jsonl");
    roots.push(sourceRoot, targetRoot);
    await symlink(targetRoot, linkedRoot);
    await writeFile(artifactPath, "saved evidence\n");

    const expected = createHash("sha256")
      .update("saved evidence\n")
      .digest("hex");
    await expect(
      verifyArtifactRef(linkedRoot, "rawTranscript", {
        path: "raw-host.jsonl",
        sha256: expected,
      }),
    ).rejects.toThrow("source_path_symlink");
  });

  test("includes hashes for every trusted reanalysis implementation file", async () => {
    const hashes = await hashReanalysisSourceFiles();
    expect(Object.keys(hashes)).toEqual(Object.keys(REANALYSIS_SOURCE_FILES));
    for (const hash of Object.values(hashes)) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
