import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import {
  type AutoAdoptionInput,
  type RunMirrorSync,
  adoptSkillOptCandidate,
} from "../adoption";
import { recoverAdoptionWals } from "../adoption-transaction";
import { freezeCandidateVariant } from "../variants";

const roots: string[] = [];
const skill = "kibi-usage" as const;
const frontmatter = `---\nid: ${skill}\nname: Kibi Usage\ndescription: Test fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.1.0"\nresources:\n  - resources/workflows.md\n---\n`;
const baselineBody = "\n# Baseline\n";
const candidateBody = "\n# Adopted candidate\n";
const resourceBody = "workflow fixture\n";
const checkpointHash = "a".repeat(64);
const rootSet = {
  corpus: "b".repeat(64),
  evaluator: "c".repeat(64),
  querySet: "d".repeat(64),
  baseline: "e".repeat(64),
  catalog: "f".repeat(64),
  verifier: "1".repeat(64),
  publicRoot: "2".repeat(64),
  privateRoot: "3".repeat(64),
  artifactSchema: "4".repeat(64),
};

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

function hash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new Error("fixture cannot be canonicalized");
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function fixture(): Promise<
  Readonly<{ repoRoot: string; input: AutoAdoptionInput }>
> {
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-recovery-"));
  roots.push(repoRoot);
  const canonical = join(repoRoot, "packages/cli/src/public/skills", skill);
  await mkdir(join(canonical, "resources"), { recursive: true });
  await writeFile(join(canonical, "SKILL.md"), frontmatter + baselineBody);
  await writeFile(join(canonical, "resources/workflows.md"), resourceBody);
  for (const target of ["cursor", "codex"] as const) {
    await mkdir(join(repoRoot, `packages/${target}/skills`), {
      recursive: true,
    });
    await cp(
      join(repoRoot, "packages/cli/src/public/skills"),
      join(repoRoot, `packages/${target}/skills`),
      { recursive: true },
    );
  }
  const manifest = {
    id: skill,
    name: "Kibi Usage",
    description: "Test fixture",
    version: "1.0.0",
    kibiCompatibility: ">=0.1.0",
    resources: ["resources/workflows.md"],
  };
  const candidate = freezeCandidateVariant({
    skill,
    variant: "skillopt",
    body: candidateBody,
    frontmatterHash: hash(manifest),
    resourcesHash: hash({ "resources/workflows.md": resourceBody }),
    provenance: "skillopt",
    sourceRequestHash: checkpointHash,
  });
  return {
    repoRoot,
    input: {
      repoRoot,
      candidate,
      frontmatterHash: candidate.frontmatterHash,
      resourcesHash: candidate.resourcesHash,
      eligibility: {
        runId: "run-a",
        eligibilityReceiptId: checkpointHash,
        heldOutEligibility: "eligible",
        candidateHash: candidate.bodyHash,
        authorizedRootSet: rootSet,
        lineage: {
          candidateHash: candidate.bodyHash,
          trainerCheckpointHash: checkpointHash,
          authorizedRootSet: rootSet,
        },
        sealedEvidenceHash: hash({
          runId: "run-a",
          eligibilityReceiptId: checkpointHash,
          heldOutEligibility: "eligible",
          candidateHash: candidate.bodyHash,
          authorizedRootSet: rootSet,
          lineage: {
            candidateHash: candidate.bodyHash,
            trainerCheckpointHash: checkpointHash,
            authorizedRootSet: rootSet,
          },
        }),
      },
    },
  };
}

const syncMirrors: RunMirrorSync = async (repoRoot) => {
  for (const target of ["cursor", "codex"] as const) {
    const mirror = join(repoRoot, `packages/${target}/skills`);
    await rm(mirror, { recursive: true, force: true });
    await cp(join(repoRoot, "packages/cli/src/public/skills"), mirror, {
      recursive: true,
    });
  }
};

function externalVerdict(input: AutoAdoptionInput) {
  return {
    verdictId: "external-verdict-a",
    authentication: "test-external-authentication",
    sourceCanonicalPreimageHash: sha256(frontmatter + baselineBody),
    rootAuthorization: input.eligibility.authorizedRootSet,
    supervisorParentId: "supervisor-parent-a",
    invocationId: "invocation-a",
    runId: input.eligibility.runId,
    skill: input.candidate.skill,
    matrixId: "held-out-matrix-a",
    fixtureClaimHash: "5".repeat(64),
    candidateHash: input.candidate.bodyHash,
    terminalEvidenceHash: input.eligibility.sealedEvidenceHash,
    targetSet: [
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
      "packages/cursor/skills",
      "packages/codex/skills",
    ],
  } as const;
}

function adopt(
  input: AutoAdoptionInput,
  dependencies: NonNullable<Parameters<typeof adoptSkillOptCandidate>[2]>,
) {
  return adoptSkillOptCandidate(input, externalVerdict(input), {
    ...dependencies,
    verifyExternalAdoptionVerdict: async () => true,
  });
}

type PromiseSettlement<T> =
  | {
      readonly kind: "ok";
      readonly value: T;
    }
  | {
      readonly kind: "err";
      readonly error: unknown;
    };

async function settlePromise<T>(
  promise: Promise<T>,
): Promise<PromiseSettlement<T>> {
  return promise.then(
    (value) => ({ kind: "ok" as const, value }),
    (error) => ({ kind: "err" as const, error }),
  );
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  return new Error(String(value));
}

for (const crashPhase of [
  "prepared",
  "canonical-installed",
  "mirrors-synced",
  "receipt-installed",
] as const) {
  test(`Given a crash after ${crashPhase} When the candidate is retried Then recovery finishes the same transaction`, async () => {
    // Given
    const { repoRoot, input } = await fixture();
    const crashingDependencies = {
      runMirrorSync: syncMirrors,
      afterPhase: async (phase: string) => {
        if (phase === crashPhase) throw new Error(`crash:${phase}`);
      },
    };

    // When
    const crash = await settlePromise(adopt(input, crashingDependencies));
    if (crash.kind === "ok") {
      throw new Error(
        `expected adoption failure for crash phase ${crashPhase}`,
      );
    }
    expect(crash.kind).toBe("err");
    expect(toError(crash.error).message).toBe(`crash:${crashPhase}`);
    const receipt = await adopt(input, {
      runMirrorSync: syncMirrors,
    });

    // Then
    expect(receipt.status).toBe("adopted");
    const written = await settlePromise(
      readFile(
        join(repoRoot, "packages/codex/skills/kibi-usage/SKILL.md"),
        "utf8",
      ),
    );
    expect(written.kind).toBe("ok");
    if (written.kind === "ok") {
      expect(written.value).toBe(frontmatter + candidateBody);
    }
  });
}

test("Given a terminal WAL with a replaced receipt When the same candidate is retried Then the receipt hash mismatch is rejected", async () => {
  // Given
  const { repoRoot, input } = await fixture();
  const first = await adopt(input, {
    runMirrorSync: syncMirrors,
  });
  if (first.adoptionId === undefined) throw new Error("missing adoption ID");
  await writeFile(
    join(repoRoot, ".kibi/adoption-wals", first.adoptionId, "receipt.json"),
    `${JSON.stringify({
      ...first,
      candidateBodyHash: "0".repeat(64),
    })}\n`,
  );

  // When
  const attempt = adopt(input, { runMirrorSync: syncMirrors });

  // Then
  const mismatch = await settlePromise(attempt);
  expect(mismatch.kind).toBe("err");
  if (mismatch.kind === "err") {
    expect(toError(mismatch.error).message).toContain("receipt mismatch");
  }
});

test("Given a terminal WAL receipt replaced by a symlink When the candidate is retried Then recovery rejects the substituted inode", async () => {
  // Given
  const { repoRoot, input } = await fixture();
  const first = await adopt(input, {
    runMirrorSync: syncMirrors,
  });
  if (first.adoptionId === undefined) throw new Error("missing adoption ID");
  const receipt = join(
    repoRoot,
    ".kibi/adoption-wals",
    first.adoptionId,
    "receipt.json",
  );
  const outside = join(repoRoot, "substituted-receipt.json");
  await cp(receipt, outside);
  await rm(receipt);
  await symlink(outside, receipt);

  // When
  const attempt = adopt(input, { runMirrorSync: syncMirrors });

  // Then
  const symlinkFailure = await settlePromise(attempt);
  expect(symlinkFailure.kind).toBe("err");
  if (symlinkFailure.kind === "err") {
    expect(toError(symlinkFailure.error).message).toContain("symlink");
  }
});

test("Given canonical bytes replaced after WAL preparation When automatic adoption continues Then inode drift is rejected", async () => {
  // Given
  const { repoRoot, input } = await fixture();
  const canonical = join(
    repoRoot,
    "packages/cli/src/public/skills/kibi-usage/SKILL.md",
  );

  // When
  const attempt = adopt(input, {
    runMirrorSync: syncMirrors,
    afterPhase: async (phase) => {
      if (phase === "prepared") {
        await rm(canonical);
        await writeFile(canonical, `${frontmatter}\n# Replaced\n`);
      }
    },
  });

  // Then
  const canonicalFailure = await settlePromise(attempt);
  expect(canonicalFailure.kind).toBe("err");
  if (canonicalFailure.kind === "err") {
    expect(toError(canonicalFailure.error).message).toContain(
      "canonical bytes drifted",
    );
  }
});

test("Given a WAL journal targeting another repository file When the candidate is retried Then recovery rejects the redirected path", async () => {
  // Given
  const { repoRoot, input } = await fixture();
  const first = await adopt(input, {
    runMirrorSync: syncMirrors,
  });
  if (first.adoptionId === undefined) throw new Error("missing adoption ID");
  const journalPath = join(
    repoRoot,
    ".kibi/adoption-wals",
    first.adoptionId,
    "journal.json",
  );
  const journal: unknown = JSON.parse(await readFile(journalPath, "utf8"));
  if (
    typeof journal !== "object" ||
    journal === null ||
    Array.isArray(journal)
  ) {
    throw new Error("fixture journal must be an object");
  }
  await writeFile(
    journalPath,
    `${JSON.stringify({ ...journal, canonicalPath: "package.json" })}\n`,
  );

  // When
  const attempt = adopt(input, { runMirrorSync: syncMirrors });

  // Then
  const journalFailure = await settlePromise(attempt);
  expect(journalFailure.kind).toBe("err");
  if (journalFailure.kind === "err") {
    expect(toError(journalFailure.error).message).toContain(
      "journal target mismatch",
    );
  }
});

test("Given a durable automatic adoption When files are installed Then every rename and no-replace receipt follows fsync ordering", async () => {
  // Given
  const { input } = await fixture();
  const steps: string[] = [];

  // When
  await adopt(input, {
    runMirrorSync: syncMirrors,
    durabilityObserver: async (step) => {
      steps.push(step);
    },
  });

  // Then
  const rename = steps.indexOf("renamed");
  const receipt = steps.lastIndexOf("receipt-fsynced");
  expect(steps.slice(0, rename)).toContain("stage-fsynced");
  expect(steps[rename + 1]).toBe("directory-fsynced");
  expect(receipt).toBeGreaterThan(-1);
  expect(steps[receipt + 1]).toBe("parent-fsynced");
});

test("Given a crash after a partial mirror swap When WAL recovery runs Then every canonical and mirror preimage is restored before retry", async () => {
  // Given
  const { repoRoot, input } = await fixture();
  const before = await Promise.all([
    readFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      "utf8",
    ),
    readFile(
      join(repoRoot, "packages/cursor/skills/kibi-usage/SKILL.md"),
      "utf8",
    ),
    readFile(
      join(repoRoot, "packages/codex/skills/kibi-usage/SKILL.md"),
      "utf8",
    ),
  ]);
  const failingSync: RunMirrorSync = async (root) => {
    await writeFile(
      join(root, "packages/cursor/skills/kibi-usage/SKILL.md"),
      "partial mirror mutation\n",
    );
    throw new Error("injected mirror failure");
  };
  const recoverableFailure = await settlePromise(
    adopt(input, { runMirrorSync: failingSync }),
  );
  expect(recoverableFailure.kind).toBe("err");
  if (recoverableFailure.kind === "err") {
    expect(toError(recoverableFailure.error).message).toBe(
      "injected mirror failure",
    );
  }

  // When
  await recoverAdoptionWals(repoRoot, { runMirrorSync: syncMirrors });

  // Then
  const restored = await settlePromise(
    Promise.all([
      readFile(
        join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
        "utf8",
      ),
      readFile(
        join(repoRoot, "packages/cursor/skills/kibi-usage/SKILL.md"),
        "utf8",
      ),
      readFile(
        join(repoRoot, "packages/codex/skills/kibi-usage/SKILL.md"),
        "utf8",
      ),
    ]),
  );
  expect(restored.kind).toBe("ok");
  if (restored.kind === "ok") {
    expect(restored.value).toEqual(before);
  }
});
