import { afterEach, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { missingRequiredGuidance } from "../candidate-body";
import type { CanonicalSkill } from "../catalog";
import { inspectHistoricalCandidates } from "../historical-candidates";

const roots: string[] = [];
const USAGE = "kibi-usage" satisfies CanonicalSkill;
const FRESHNESS = "kibi-freshness" satisfies CanonicalSkill;
const RUN_A = "00000000-0000-4000-8000-000000000101";
const RUN_B = "00000000-0000-4000-8000-000000000102";
const RUN_C = "00000000-0000-4000-8000-000000000103";
const RUN_D = "00000000-0000-4000-8000-000000000104";
const RUN_E = "00000000-0000-4000-8000-000000000105";
const RUN_F = "00000000-0000-4000-8000-000000000106";
const RUN_G = "00000000-0000-4000-8000-000000000107";
const RUN_H = "00000000-0000-4000-8000-000000000108";
const RUN_I = "00000000-0000-4000-8000-000000000109";
const RUN_J = "00000000-0000-4000-8000-000000000110";

const COMPLETE_BODY = [
  ...missingRequiredGuidance(""),
  "Safety-compliant generic operational guidance.",
  "Operational detail. ".repeat(80),
].join("\n");
const TRUNCATED_BODY = COMPLETE_BODY.slice(0, 240);
const UNSAFE_BODY = `${COMPLETE_BODY}\nOpenCode-specific behavior is prohibited.`;

afterEach(async () => {
  mock.restore();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-historical-candidates-"));
  roots.push(root);
  return root;
}

async function put(path: string, contents: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

function skillRoot(root: string, runId: string, skill: CanonicalSkill): string {
  return join(root, runId, "skills", skill);
}

function sha256(contents: string | Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function writeReview(
  root: string,
  runId: string,
  entries: readonly { skill: CanonicalSkill; bodyHash: string }[],
): Promise<void> {
  await put(
    join(root, runId, "optimization-review.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimization-review",
      runId,
      skills: [...new Set(entries.map((entry) => entry.skill))],
      candidates: entries.map((entry) => ({
        skill: entry.skill,
        candidateBodyHash: entry.bodyHash,
      })),
    })}\n`,
  );
}

async function writeReviewedCandidate(
  root: string,
  runId: string,
  skill: CanonicalSkill,
  body: string,
): Promise<void> {
  await put(join(skillRoot(root, runId, skill), "candidate_skill.md"), body);
  await writeReview(root, runId, [{ skill, bodyHash: sha256(body) }]);
}

async function writeReviewedBest(
  root: string,
  runId: string,
  skill: CanonicalSkill,
  body: string,
): Promise<void> {
  await put(
    join(skillRoot(root, runId, skill), "trainer-output", "best_skill.md"),
    body,
  );
  await writeReview(root, runId, [{ skill, bodyHash: sha256(body) }]);
}

async function writeTrainerVersion(
  root: string,
  runId: string,
  skill: CanonicalSkill,
  body: string,
): Promise<void> {
  await put(
    join(
      skillRoot(root, runId, skill),
      "trainer-output",
      "skills",
      "skill_v0001.md",
    ),
    body,
  );
}

async function writeAccepted(
  root: string,
  runId: string,
  skill: CanonicalSkill,
  step: number,
  body: string,
  overrides: Readonly<Record<string, unknown>> = {},
): Promise<void> {
  const acceptedRoot = join(
    skillRoot(root, runId, skill),
    "trainer-run",
    "optimizer",
    `step-${String(step).padStart(4, "0")}`,
    "requests",
    "optimizer-artifacts",
    "accepted-output",
  );
  await mkdir(join(skillRoot(root, runId, skill), "trainer-output"), {
    recursive: true,
  });
  await put(join(acceptedRoot, "candidate-body.md"), body);
  await put(
    join(acceptedRoot, "receipt.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-accepted-optimizer-output",
      runId,
      skill,
      step,
      bodyHash: sha256(body),
      bodyBytes: Buffer.byteLength(body, "utf8"),
      ...overrides,
    })}\n`,
  );
}

async function makeFifo(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const process = Bun.spawn(["mkfifo", path]);
  expect(await process.exited).toBe(0);
}

test("valid accepted receipts verify exact provenance and deduplicate by skill and body", async () => {
  const root = await temporaryRoot();
  const distinctUsageBody = `${COMPLETE_BODY}\nDistinct usage candidate.`;

  await put(
    join(skillRoot(root, RUN_A, USAGE), "candidate_skill.md"),
    COMPLETE_BODY,
  );
  await put(
    join(skillRoot(root, RUN_A, USAGE), "trainer-output", "best_skill.md"),
    COMPLETE_BODY,
  );
  await writeReview(root, RUN_A, [
    { skill: USAGE, bodyHash: sha256(COMPLETE_BODY) },
  ]);
  await writeAccepted(root, RUN_B, USAGE, 7, COMPLETE_BODY);
  await writeReviewedCandidate(root, RUN_C, USAGE, distinctUsageBody);
  await writeReviewedCandidate(root, RUN_D, FRESHNESS, COMPLETE_BODY);

  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: {
      [USAGE]: "canonical usage baseline",
      [FRESHNESS]: "canonical freshness baseline",
    },
  });

  expect(report).toMatchObject({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-historical-inventory",
    screening: "offline-only",
    paidModelCalls: 0,
    productionAdoption: "external-verdict-required",
    root,
  });
  expect(report.candidates).toHaveLength(3);
  expect(report.shortlist).toHaveLength(3);

  const usageBodies = report.candidates.filter(
    (candidate) => candidate.skill === USAGE,
  );
  expect(usageBodies).toHaveLength(2);
  expect(new Set(usageBodies.map((candidate) => candidate.hash)).size).toBe(2);

  const duplicate = usageBodies.find(
    (candidate) => candidate.hash === sha256(COMPLETE_BODY),
  );
  expect(duplicate).toMatchObject({
    skill: USAGE,
    bodyBytes: Buffer.byteLength(COMPLETE_BODY, "utf8"),
    validation: "complete",
    baselineIdentical: false,
    missingGuidance: [],
    reasons: [],
  });
  expect(duplicate?.origins.map((origin) => origin.verified)).toEqual([
    true,
    true,
    true,
  ]);
  expect(duplicate?.origins.map((origin) => origin.path)).toEqual([
    `${RUN_A}/skills/kibi-usage/candidate_skill.md`,
    `${RUN_A}/skills/kibi-usage/trainer-output/best_skill.md`,
    `${RUN_B}/skills/kibi-usage/trainer-run/optimizer/step-0007/requests/optimizer-artifacts/accepted-output/candidate-body.md`,
  ]);
  expect(duplicate?.origins.map((origin) => origin.runId)).toEqual([
    RUN_A,
    RUN_A,
    RUN_B,
  ]);

  const sameBodyDifferentSkill = report.candidates.find(
    (candidate) => candidate.skill === FRESHNESS,
  );
  expect(sameBodyDifferentSkill?.hash).toBe(sha256(COMPLETE_BODY));
  expect(sameBodyDifferentSkill?.origins).toHaveLength(1);
  expect(report.shortlist.map((candidate) => candidate.skill)).toContain(
    FRESHNESS,
  );
});

test("classifies incomplete, truncated, empty, and unsafe bodies but excludes them from the shortlist", async () => {
  const root = await temporaryRoot();
  const cases = [
    { runId: RUN_E, body: TRUNCATED_BODY, validation: "incomplete" },
    { runId: RUN_F, body: "", validation: "incomplete" },
    { runId: RUN_G, body: UNSAFE_BODY, validation: "unsafe" },
  ] as const;

  for (const candidate of cases) {
    await writeReviewedCandidate(root, candidate.runId, USAGE, candidate.body);
  }

  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "different baseline" },
  });

  expect(report.candidates).toHaveLength(cases.length);
  expect(report.shortlist).toEqual([]);
  for (const expected of cases) {
    const candidate = report.candidates.find((item) =>
      item.origins.some((origin) => origin.runId === expected.runId),
    );
    expect(candidate).toMatchObject({
      skill: USAGE,
      validation: expected.validation,
      baselineIdentical: false,
    });
    expect(candidate?.origins.every((origin) => origin.verified)).toBe(true);
  }
});

test("receipt hash, byte, run, skill, and step mismatches remain inventory-only", async () => {
  const root = await temporaryRoot();
  const cases = [
    {
      runId: RUN_A,
      label: "hash",
      override: { bodyHash: "f".repeat(64) },
      reason: "receipt_hash_mismatch",
    },
    {
      runId: RUN_B,
      label: "bytes",
      override: { bodyBytes: Buffer.byteLength(COMPLETE_BODY, "utf8") + 1 },
      reason: "receipt_body_bytes_mismatch",
    },
    {
      runId: RUN_C,
      label: "run",
      override: { runId: RUN_D },
      reason: "receipt_run_id_mismatch",
    },
    {
      runId: RUN_E,
      label: "skill",
      override: { skill: FRESHNESS },
      reason: "receipt_skill_mismatch",
    },
    {
      runId: RUN_F,
      label: "step",
      override: { step: 99 },
      reason: "receipt_step_mismatch",
    },
  ] as const;

  for (const candidate of cases) {
    await writeAccepted(
      root,
      candidate.runId,
      USAGE,
      1,
      `${COMPLETE_BODY}\nReceipt mismatch: ${candidate.label}.`,
      candidate.override,
    );
  }

  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "different baseline" },
  });

  expect(report.candidates).toHaveLength(cases.length);
  expect(report.shortlist).toEqual([]);
  for (const expected of cases) {
    const candidate = report.candidates.find((item) =>
      item.origins.some((origin) => origin.runId === expected.runId),
    );
    expect(candidate?.validation).toBe("complete");
    expect(candidate?.origins).toEqual([
      expect.objectContaining({
        runId: expected.runId,
        verified: false,
        reason: expected.reason,
      }),
    ]);
  }
});

test("candidates without review or receipt provenance stay in the inventory only", async () => {
  const root = await temporaryRoot();
  const unreviewedBody = `${COMPLETE_BODY}\nNo review metadata.`;
  const unreceiptedBody = `${COMPLETE_BODY}\nTrainer version without receipt.`;

  await put(
    join(skillRoot(root, RUN_G, USAGE), "candidate_skill.md"),
    unreviewedBody,
  );
  await writeTrainerVersion(root, RUN_H, USAGE, unreceiptedBody);

  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "different baseline" },
  });

  expect(report.candidates).toHaveLength(2);
  expect(report.shortlist).toEqual([]);
  expect(
    report.candidates.find((candidate) => candidate.origins[0]?.runId === RUN_G)
      ?.origins[0],
  ).toMatchObject({
    verified: false,
    reason: "review_missing",
  });
  expect(
    report.candidates.find((candidate) => candidate.origins[0]?.runId === RUN_H)
      ?.origins[0],
  ).toMatchObject({
    verified: false,
    reason: "trainer_version_no_receipt",
  });
});

test("private, held-out, and unsafe filesystem entries are neither read nor blocking", async () => {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  const privateMarker = "PRIVATE_ARTIFACT_MUST_NOT_BE_DISCLOSED";
  const privateBody = `${privateMarker}\n${COMPLETE_BODY}`;
  const privateDir = join(root, "private");
  const privateBodyPath = join(privateDir, "secret-body.md");
  await put(privateBodyPath, privateBody);

  for (const directory of [
    "private",
    "held-out",
    "episodes",
    ".kb",
    "optimizer-runtime",
    "failed-output",
  ]) {
    const lookalikePath =
      directory === "private"
        ? ["nested", "candidate_skill.md"]
        : ["candidate_skill.md"];
    await put(
      join(root, directory, RUN_I, "skills", USAGE, ...lookalikePath),
      `${privateMarker}:${directory}`,
    );
  }
  await makeFifo(
    join(privateDir, RUN_I, "skills", USAGE, "candidate_skill.md"),
  );

  const outsideBest = join(outside, "best_skill.md");
  await put(outsideBest, privateBody);
  const symlinkRoot = skillRoot(root, RUN_I, USAGE);
  await mkdir(symlinkRoot, { recursive: true });
  await put(
    join(root, RUN_I, "optimization-review.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimization-review",
      runId: RUN_I,
      skills: [USAGE],
      candidates: [{ skill: USAGE, candidateBodyHash: sha256(privateBody) }],
    })}\n`,
  );
  await symlink(privateBodyPath, join(symlinkRoot, "candidate_skill.md"));
  await symlink(outside, join(symlinkRoot, "trainer-output"));

  const hardlinkSource = join(root, "hardlink-source.md");
  const hardlinkBody = `${COMPLETE_BODY}\nHardlink candidate.`;
  await put(hardlinkSource, hardlinkBody);
  await mkdir(skillRoot(root, RUN_J, USAGE), { recursive: true });
  await link(
    hardlinkSource,
    join(skillRoot(root, RUN_J, USAGE), "candidate_skill.md"),
  );
  await writeReview(root, RUN_J, [
    { skill: USAGE, bodyHash: sha256(hardlinkBody) },
  ]);

  const oversized = Buffer.alloc(1024 * 1024 + 1, "x");
  await put(
    join(skillRoot(root, RUN_C, USAGE), "candidate_skill.md"),
    oversized,
  );
  await writeReview(root, RUN_C, [
    { skill: USAGE, bodyHash: sha256(oversized) },
  ]);

  const validBody = `${COMPLETE_BODY}\nPublic control candidate.`;
  await writeReviewedCandidate(root, RUN_D, USAGE, validBody);

  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "different baseline" },
  });
  const serialized = JSON.stringify(report);

  expect(report.candidates).toHaveLength(1);
  expect(report.shortlist).toHaveLength(1);
  expect(report.shortlist[0]?.hash).toBe(sha256(validBody));
  expect(serialized).not.toContain(privateMarker);
  expect(serialized).not.toContain(sha256(privateBody));
  expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
    expect.arrayContaining([
      "symlink_file",
      "symlink_directory",
      "hardlinked_file",
      "file_too_large",
    ]),
  );
});

test("baseline-identical and missing-baseline candidates are not shortlisted, and reports are deterministic", async () => {
  const cases = [
    {
      label: "baseline-identical",
      baselineIdentical: true,
      reason: "baseline_identical",
    },
    {
      label: "baseline-omitted",
      baselineIdentical: null,
      reason: "baseline_not_supplied",
    },
  ] as const;

  for (const expected of cases) {
    const root = await temporaryRoot();
    const body = `${COMPLETE_BODY}\n${expected.label}.`;
    await writeReviewedCandidate(root, RUN_A, USAGE, body);

    const input =
      expected.baselineIdentical === null
        ? { artifactRoot: root }
        : { artifactRoot: root, baselineBodies: { [USAGE]: body } };
    const first = await inspectHistoricalCandidates(input);
    const second = await inspectHistoricalCandidates(input);

    expect(second).toEqual(first);
    expect(first.candidates).toHaveLength(1);
    expect(first.candidates[0]).toMatchObject({
      validation: "complete",
      baselineIdentical: expected.baselineIdentical,
    });
    expect(first.candidates[0]?.reasons).toContain(expected.reason);
    expect(first.shortlist).toEqual([]);
  }
});

test("symlinked intermediate directories and root ancestors cannot expose private candidates", async () => {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  await writeReviewedCandidate(outside, RUN_A, USAGE, COMPLETE_BODY);
  await mkdir(join(root, RUN_A), { recursive: true });
  await symlink(join(outside, RUN_A, "skills"), join(root, RUN_A, "skills"));
  await mkdir(skillRoot(root, RUN_B, USAGE), { recursive: true });
  await symlink(outside, join(skillRoot(root, RUN_B, USAGE), "trainer-run"));
  const report = await inspectHistoricalCandidates({ artifactRoot: root });
  expect(report.candidates).toEqual([]);
  expect(
    report.diagnostics.filter((item) => item.code === "symlink_directory"),
  ).toHaveLength(2);
  const alias = join(root, "alias");
  await symlink(outside, alias);
  const aliased = await inspectHistoricalCandidates({
    artifactRoot: join(alias, RUN_A),
  });
  expect(aliased.candidates).toEqual([]);
  expect(aliased.diagnostics[0]?.code).toBe("symlink_ancestor");
});

test("seed lineage is retained without turning an unverified intermediate into a winner", async () => {
  const root = await temporaryRoot();
  await writeTrainerVersion(root, RUN_A, USAGE, COMPLETE_BODY);
  const seedHash = sha256("prior seed");
  await put(
    join(skillRoot(root, RUN_A, USAGE), "seed-candidate.json"),
    JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-resume-seed",
      bodyHash: seedHash,
      bodyBytes: 10,
    }),
  );
  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "baseline" },
  });
  expect(report.candidates[0]?.origins[0]).toMatchObject({
    seedHash,
    verified: false,
  });
  expect(report.shortlist).toEqual([]);
});

test("empty runs and interrupted accepted outputs remain visible as diagnostics", async () => {
  const root = await temporaryRoot();
  await mkdir(join(root, RUN_A));
  const acceptedA = join(
    skillRoot(root, RUN_B, USAGE),
    "one-shot/accepted-output",
  );
  await mkdir(acceptedA, { recursive: true });
  await put(join(acceptedA, "receipt.json"), "{}");
  const acceptedB = join(
    skillRoot(root, RUN_C, USAGE),
    "one-shot/accepted-output",
  );
  await put(join(acceptedB, "candidate-body.md"), COMPLETE_BODY);
  const report = await inspectHistoricalCandidates({
    artifactRoot: root,
    baselineBodies: { [USAGE]: "baseline" },
  });
  expect(report.candidates).toHaveLength(1);
  expect(report.shortlist).toEqual([]);
  expect(report.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "no_candidate_body", runId: RUN_A }),
      expect.objectContaining({ code: "accepted_body_missing", runId: RUN_B }),
      expect.objectContaining({
        code: "accepted_receipt_missing",
        runId: RUN_C,
      }),
    ]),
  );
});
