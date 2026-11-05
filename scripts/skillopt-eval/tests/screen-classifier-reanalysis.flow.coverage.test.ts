import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fsPromises from "node:fs/promises";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSkillCatalog } from "../catalog";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { summarizeScreen } from "../development-screen";
import { materializeFixtureRun } from "../fixtures/private";
import { persistCodexEpisode } from "../runtime/codex-cell-artifacts";
import {
  type CodexEpisodeReceipt,
  replayCodexEpisode,
} from "../runtime/codex-episode";
import { taskFinalStateRequests } from "../runtime/final-state-requests";
import { resolveTaskFixture } from "../runtime/task-fixture";
import * as scoring from "../scoring/cell";
import {
  OfflineReanalysisError,
  main,
  parseOfflineReanalysisArgs,
  runOfflineClassifierReanalysis,
} from "../screen-classifier-reanalysis";
import type { FrozenVariant } from "../variants";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";
import { SCORE } from "./fixtures/codex-cell-runner-fixtures";

const RUN = "00000000-0000-4000-8000-0000000005a1";
const SKILL = "kibi-usage";
const TRANSCRIPT = [
  JSON.stringify({ type: "thread.started", thread_id: "thread-screen" }),
  JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
  }),
].join("\n");

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  while (restores.length > 0) restores.pop()?.();
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function stubLatentScore(latent: scoring.CellReceipt = SCORE): void {
  const spy = spyOn(scoring, "scoreCell").mockImplementation(() => latent);
  restores.push(() => spy.mockRestore());
}

type Screen = Readonly<{
  base: string;
  sourceRoot: string;
  fixtureRunRoot: string;
  artifactRoot: string;
  lock: Record<string, unknown>;
  review: Record<string, unknown>;
  receipts: readonly Readonly<{ path: string; receipt: CodexEpisodeReceipt }>[];
}>;

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

function withLockHash(identity: Record<string, unknown>) {
  return {
    ...identity,
    lockHash: contractHash(JsonValueSchema.parse(identity)),
  };
}

/** A completed two-surface, four-task screen with real receipts. */
async function completedScreen(
  latent: scoring.CellReceipt = SCORE,
): Promise<Screen> {
  const base = await realpath(
    await mkdtemp(join(tmpdir(), "kibi-screen-flow-")),
  );
  roots.push(base);
  const sourceRoot = join(base, "screen", RUN);
  const fixtureRunRoot = join(base, "fixtures", RUN);
  const artifactRoot = join(base, "reanalysis", "out");
  await mkdir(join(base, "fixtures"), { recursive: true });
  const tasks = buildSkillCatalog(SKILL)
    .filter((task) => task.split === "development")
    .slice(0, 4);
  materializeFixtureRun({
    runRoot: fixtureRunRoot,
    canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    publicTasks: tasks,
    heldOutTasks: [],
  });
  const lockTasks = await Promise.all(
    tasks.map(async (task) => {
      const text = await readFile(
        join(
          fixtureRunRoot,
          "public",
          "development",
          "tasks",
          task.id,
          "task.json",
        ),
        "utf8",
      );
      const manifest = JSON.parse(text) as {
        workspaceHash: string;
        task: { prompt: string };
      };
      return {
        id: task.id,
        family: task.family,
        split: "development" as const,
        publicClaim: {
          taskId: task.id,
          text: manifest.task.prompt,
          publicManifestHash: sha256(text),
          workspaceHash: manifest.workspaceHash,
        },
      };
    }),
  );

  await mkdir(sourceRoot, { recursive: true });
  const bodies = {
    baseline: "# Kibi Usage\n\nBaseline body.\n",
    skillopt: "# Kibi Usage\n\nCandidate body.\n",
  } as const;
  const surfaces = (["baseline", "skillopt"] as const).map((variant) => ({
    schemaVersion: "1.0.0" as const,
    artifactType: "skillopt-variant" as const,
    skill: SKILL,
    variant,
    status: "frozen" as const,
    bodyHash: sha256(bodies[variant]),
    frontmatterHash: "a".repeat(64),
    resourcesHash: "b".repeat(64),
    provenance: variant === "baseline" ? "canonical" : "skillopt",
  }));
  for (const variant of ["baseline", "skillopt"] as const) {
    await writeFile(
      join(sourceRoot, `body-${sha256(bodies[variant])}.md`),
      bodies[variant],
    );
  }
  const lock = withLockHash({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-development-screen-lock",
    runId: RUN,
    sourceCommit: "c".repeat(40),
    skill: SKILL,
    repeats: 1,
    maxCells: 8,
    surfaces,
    tasks: lockTasks,
    productionAdoption: "external-verdict-required",
  });
  await writeJson(join(sourceRoot, "screen-lock.json"), lock);

  const cells: Record<string, unknown>[] = [];
  const receipts: { path: string; receipt: CodexEpisodeReceipt }[] = [];
  let episode = 0;
  for (const surface of surfaces) {
    for (const task of lockTasks) {
      episode += 1;
      const episodeId = `00000000-0000-4000-8000-${String(episode).padStart(12, "0")}`;
      const fixture = await resolveTaskFixture({
        fixtureRunRoot,
        taskId: task.id,
        publicClaim: task.publicClaim,
      });
      const manifest = fixture.evaluatorManifest;
      const requests = taskFinalStateRequests(
        task.id,
        manifest.protocolContract?.exactMigrationApply !== undefined,
      ).map((request) => ({
        ...request,
        result: { ok: true },
        resultHash: sha256(JSON.stringify({ ok: true })),
      }));
      const finalState = `${JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "/isolated/workspace",
        binding: {
          caseId: task.id,
          sequence: 1,
          roots: {
            publicManifestHash: manifest.publicManifestHash,
            workspaceHash: manifest.workspaceHash,
            fixtureSeedHash: manifest.fixtureSeedHash,
          },
        },
        requests,
      })}\n`;
      const evidence = {
        brokerTrace: '{"kind":"tools/call"}\n',
        diagnosticReceipt: '{"tool":"kb_status"}\n',
        finalState,
      };
      const receipt = replayCodexEpisode({
        request: {
          schemaVersion: "1.0.0",
          artifactType: "episode-request",
          episodeId,
          runId: RUN,
          runLockHash: lock.lockHash,
          variant: surface.variant,
          skill: SKILL,
          taskId: task.id,
          attempt: 1,
          prompt: task.publicClaim.text,
          workspaceFixtureHash: task.publicClaim.workspaceHash,
        },
        transcript: TRANSCRIPT,
        stderr: "",
        exitCode: 0,
        termination: "exit",
        startedAt: "2026-10-01T10:00:00Z",
        finishedAt: "2026-10-01T10:00:01Z",
        evidence,
        score: latent,
        hiddenMarkers: [],
        forbiddenRoots: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
      });
      const episodeRoot = join(sourceRoot, "episodes", episodeId);
      await mkdir(episodeRoot, { recursive: true });
      const path = await persistCodexEpisode(episodeRoot, receipt, {
        transcript: TRANSCRIPT,
        stderr: "",
        ...evidence,
      });
      receipts.push({ path, receipt });
      cells.push({
        score: receipt.result.score,
        hardPass: receipt.result.hardPass,
        criticalFailures: receipt.result.criticalFailures,
        securityFailures: receipt.result.criticalFailures.filter((failure) =>
          /^(?:isolation|sentinel)-/.test(failure),
        ),
        receiptPath: path,
        usage: receipt.result.usage,
        bodyHash: surface.bodyHash,
        taskId: task.id,
        family: task.family,
        replicate: 1,
      });
    }
  }
  const variants = surfaces.map((surface) => ({
    ...surface,
    body: bodies[surface.variant],
  })) as unknown as FrozenVariant[];
  const review = {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-development-screen-review",
    runId: RUN,
    lockHash: lock.lockHash,
    attemptedCells: 8,
    cells,
    status: "completed",
    smokeModelInvocationAttempts: 0,
    targetEpisodesAttempted: 8,
    targetEpisodesCompleted: 8,
    summaries: summarizeScreen(cells as never, variants),
    heldOut: "not-run",
    productionAdoption: "external-verdict-required",
  };
  await writeJson(join(sourceRoot, "screen-review.json"), review);
  return {
    base,
    sourceRoot,
    fixtureRunRoot,
    artifactRoot,
    lock,
    review,
    receipts,
  };
}

function argsFor(screen: Screen, artifactRoot = screen.artifactRoot) {
  return [
    "--source-root",
    screen.sourceRoot,
    "--fixture-run-root",
    screen.fixtureRunRoot,
    "--artifact-root",
    artifactRoot,
  ];
}

function captureOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const out = spyOn(process.stdout, "write").mockImplementation(((
    chunk: string,
  ) => {
    stdout.push(String(chunk));
    return true;
  }) as never);
  const err = spyOn(process.stderr, "write").mockImplementation(((
    chunk: string,
  ) => {
    stderr.push(String(chunk));
    return true;
  }) as never);
  restores.push(
    () => out.mockRestore(),
    () => err.mockRestore(),
  );
  return { stdout, stderr };
}

describe("offline classifier reanalysis of a completed screen", () => {
  test("rescores every saved cell and writes the report", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    const { report, reportPath } = await runOfflineClassifierReanalysis({
      sourceRoot: screen.sourceRoot,
      fixtureRunRoot: screen.fixtureRunRoot,
      artifactRoot: screen.artifactRoot,
    });
    expect(report.status).toBe("completed");
    expect(report.cells).toHaveLength(8);
    expect(report.summaries.old).toStrictEqual(report.summaries.corrected);
    expect(report.cells[0]).toMatchObject({
      old: { score: 100, hardPass: true, directKbAccess: false },
      corrected: { score: 100, hardPass: true, directKbAccess: false },
      currentDetector: { nonDirectViolationsIgnored: true },
    });
    expect(JSON.parse(await readFile(reportPath, "utf8"))).toMatchObject({
      status: "completed",
      sourceRunId: RUN,
    });
  });

  test("main reports a completed run, a limited run and a failure", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    const output = captureOutput();
    expect(await main(argsFor(screen))).toBe(0);
    expect(JSON.parse(output.stdout.at(-1) ?? "")).toMatchObject({
      status: "completed",
      sourceRunId: RUN,
      paidModelCalls: 0,
    });

    await rm(screen.fixtureRunRoot, { recursive: true });
    await mkdir(screen.fixtureRunRoot);
    expect(
      await main(argsFor(screen, join(screen.base, "reanalysis", "limited"))),
    ).toBe(1);
    expect(JSON.parse(output.stdout.at(-1) ?? "")).toMatchObject({
      status: "limited",
    });

    expect(await main(argsFor(screen))).toBe(1);
    expect(JSON.parse(output.stderr.at(-1) ?? "")).toStrictEqual({
      status: "failed",
      reason: "artifact_root_not_new",
      paidModelCalls: 0,
    });
  });

  test("main prints usage and names an unexpected failure generically", async () => {
    const output = captureOutput();
    expect(await main(["--help"])).toBe(0);
    expect(output.stdout.join("")).toStartWith("Usage: ");
    const screen = await completedScreen();
    await writeFile(join(screen.sourceRoot, "screen-lock.json"), "not json");
    expect(await main(argsFor(screen))).toBe(1);
    expect(JSON.parse(output.stderr.at(-1) ?? "")).toMatchObject({
      reason: "offline_reanalysis_failed",
    });
  });
});

describe("parseOfflineReanalysisArgs", () => {
  test("needs every root exactly once with a value", () => {
    const codeOf = (args: string[]) => {
      try {
        parseOfflineReanalysisArgs(args);
        return "parsed";
      } catch (error) {
        return (error as OfflineReanalysisError).code;
      }
    };
    expect(codeOf(["--bogus"])).toBe("invalid_reanalysis_option");
    expect(codeOf(["--source-root", "a", "--source-root", "b"])).toBe(
      "duplicate_reanalysis_option",
    );
    expect(codeOf(["--source-root"])).toBe("reanalysis_option_requires_value");
    expect(codeOf(["--source-root", "--artifact-root"])).toBe(
      "reanalysis_option_requires_value",
    );
    expect(codeOf(["--source-root", "a"])).toBe(
      "reanalysis_requires_explicit_roots",
    );
    expect(
      parseOfflineReanalysisArgs([
        "--source-root",
        "s",
        "--fixture-run-root",
        "f",
        "--artifact-root",
        "o",
      ]),
    ).toStrictEqual({
      sourceRoot: "s",
      fixtureRunRoot: "f",
      artifactRoot: "o",
    });
  });
});

const SECURITY_LATENT: scoring.CellReceipt = {
  ...SCORE,
  outcome: "fail",
  terminalCategory: "critical_security_failure",
  score: 0,
  soft: 0,
  hard: 0,
  adoptionEligible: false,
  criticalFailures: ["isolation-1"],
};

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

type Receipt = Record<string, unknown> & {
  result: Record<string, unknown>;
  evidenceIndex: Record<string, unknown>;
  artifacts: Record<string, { path: string; sha256: string }>;
};

/** Rewrites one saved artifact and every hash in the receipt that binds it. */
async function rewriteEpisode(
  screen: Screen,
  change: (receipt: Receipt, episodeRoot: string) => Promise<void> | void,
): Promise<void> {
  const [first] = screen.receipts;
  if (first === undefined) throw new Error("screen has no receipts");
  const receipt = (await readJson(first.path)) as Receipt;
  await change(receipt, join(first.path, ".."));
  await writeJson(first.path, receipt);
}

async function rewriteArtifact(
  receipt: Receipt,
  episodeRoot: string,
  key: string,
  content: string,
): Promise<void> {
  const ref = receipt.artifacts[key];
  if (ref === undefined) throw new Error(`unknown artifact ${key}`);
  await writeFile(join(episodeRoot, ref.path), content);
  ref.sha256 = sha256(content);
}

async function rewriteIndex(
  receipt: Receipt,
  episodeRoot: string,
  change: (index: Record<string, unknown>) => void,
): Promise<void> {
  change(receipt.evidenceIndex);
  receipt.result.evidenceIndexHash = contractHash(
    JsonValueSchema.parse(receipt.evidenceIndex),
  );
  await rewriteArtifact(
    receipt,
    episodeRoot,
    "evidenceIndex",
    `${JSON.stringify(receipt.evidenceIndex)}\n`,
  );
}

async function rewriteFinalState(
  receipt: Receipt,
  episodeRoot: string,
  change: (finalState: Record<string, unknown>) => void,
): Promise<void> {
  const finalState = await readJson(join(episodeRoot, "final-state.json"));
  change(finalState);
  const content = `${JSON.stringify(finalState)}\n`;
  await rewriteArtifact(receipt, episodeRoot, "finalState", content);
  await rewriteIndex(receipt, episodeRoot, (index) => {
    index.finalStateHash = sha256(content);
  });
}

async function rewriteReview(
  screen: Screen,
  change: (
    review: Record<string, unknown> & { cells: Record<string, unknown>[] },
  ) => void,
): Promise<void> {
  const path = join(screen.sourceRoot, "screen-review.json");
  const review = (await readJson(path)) as Record<string, unknown> & {
    cells: Record<string, unknown>[];
  };
  change(review);
  await writeJson(path, review);
}

async function rewriteLock(
  screen: Screen,
  change: (
    lock: Record<string, unknown> & { tasks: Record<string, unknown>[] },
  ) => void,
  rehash = true,
): Promise<void> {
  const path = join(screen.sourceRoot, "screen-lock.json");
  const lock = (await readJson(path)) as Record<string, unknown> & {
    tasks: Record<string, unknown>[];
  };
  change(lock);
  if (!rehash) {
    await writeJson(path, lock);
    return;
  }
  const { lockHash: _previous, ...identity } = lock;
  const next = withLockHash(identity);
  await writeJson(path, next);
  await rewriteReview(screen, (review) => {
    review.lockHash = next.lockHash;
  });
}

async function failureOf(
  screen: Screen,
  sourceRoot = screen.sourceRoot,
  artifactRoot = screen.artifactRoot,
): Promise<string> {
  try {
    await runOfflineClassifierReanalysis({
      sourceRoot,
      fixtureRunRoot: screen.fixtureRunRoot,
      artifactRoot,
    });
    return "completed";
  } catch (error) {
    return error instanceof OfflineReanalysisError
      ? error.code
      : `unexpected:${String(error)}`;
  }
}

describe("offline classifier reanalysis refusals", () => {
  test("a saved security failure stays a zero-score behavioural failure", async () => {
    stubLatentScore(SECURITY_LATENT);
    const screen = await completedScreen(SECURITY_LATENT);
    const { report } = await runOfflineClassifierReanalysis({
      sourceRoot: screen.sourceRoot,
      fixtureRunRoot: screen.fixtureRunRoot,
      artifactRoot: screen.artifactRoot,
    });
    expect(report.cells[0]).toMatchObject({
      old: { score: 0, status: "behavioral-failure" },
      corrected: { score: 0, criticalFailures: ["isolation-1"] },
    });
  });

  test("a latent score the transport cannot carry is refused", async () => {
    const screen = await completedScreen();
    stubLatentScore({ ...SCORE, terminalCategory: "incomplete_evidence" });
    expect(await failureOf(screen)).toBe("cell_transport_unscorable");
  });

  const tampers: ReadonlyArray<
    readonly [string, (screen: Screen) => Promise<unknown>]
  > = [
    [
      "screen_review_binding_mismatch",
      (screen) =>
        rewriteReview(screen, (review) => {
          review.runId = "00000000-0000-4000-8000-0000000005b2";
        }),
    ],
    [
      "screen_lock_hash_mismatch",
      (screen) =>
        rewriteLock(
          screen,
          (lock) => {
            lock.sourceCommit = "d".repeat(40);
          },
          false,
        ),
    ],
    [
      "screen_not_fully_completed",
      (screen) =>
        rewriteReview(screen, (review) => {
          review.status = "failed";
        }),
    ],
    [
      "screen_task_binding_mismatch",
      (screen) =>
        rewriteLock(screen, (lock) => {
          const [task] = lock.tasks;
          if (task !== undefined) task.family = "another-family";
        }),
    ],
    [
      "source_artifact_not_regular",
      async (screen) => {
        const [surface] = screen.lock.surfaces as { bodyHash: string }[];
        const path = join(screen.sourceRoot, `body-${surface?.bodyHash}.md`);
        await rm(path);
        await mkdir(path);
      },
    ],
    [
      "receipt_path_escape",
      (screen) =>
        rewriteReview(screen, (review) => {
          const [cell] = review.cells;
          if (cell !== undefined)
            cell.receiptPath = join(screen.sourceRoot, "screen-lock.json");
        }),
    ],
    [
      "source_artifact_unavailable",
      (screen) =>
        rewriteReview(screen, (review) => {
          const [cell] = review.cells;
          if (cell !== undefined) cell.receiptPath = `${cell.receiptPath}/x`;
        }),
    ],
    [
      "episode_binding_mismatch",
      async (screen) => {
        const [first] = screen.receipts;
        const moved = join(
          screen.sourceRoot,
          "episodes",
          "00000000-0000-4000-8000-0000000005c3",
        );
        await mkdir(moved);
        await writeFile(
          join(moved, "episode-receipt.json"),
          await readFile(first?.path ?? "", "utf8"),
        );
        await rewriteReview(screen, (review) => {
          const [cell] = review.cells;
          if (cell !== undefined)
            cell.receiptPath = join(moved, "episode-receipt.json");
        });
      },
    ],
    [
      "receipt_path_mismatch",
      async (screen) => {
        const [first] = screen.receipts;
        const copy = join(first?.path ?? "", "..", "copy.json");
        await writeFile(copy, await readFile(first?.path ?? "", "utf8"));
        await rewriteReview(screen, (review) => {
          const [cell] = review.cells;
          if (cell !== undefined) cell.receiptPath = copy;
        });
      },
    ],
    [
      "source_artifact_missing",
      (screen) =>
        rewriteEpisode(screen, async (_receipt, root) => {
          await rm(join(root, "raw-host.jsonl"));
        }),
    ],
    [
      "evidence_index_invalid",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteArtifact(receipt, root, "evidenceIndex", "not json"),
        ),
    ],
    [
      "evidence_index_hash_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteArtifact(
            receipt,
            root,
            "evidenceIndex",
            `${JSON.stringify({ ...receipt.evidenceIndex, truncated: true })}\n`,
          ),
        ),
    ],
    [
      "evidence_index_receipt_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt) => {
          receipt.evidenceIndex = { ...receipt.evidenceIndex, truncated: true };
        }),
    ],
    [
      "evidence_hash_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteIndex(receipt, root, (index) => {
            index.brokerTraceHash = "0".repeat(64);
          }),
        ),
    ],
    [
      "normalized_events_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteIndex(receipt, root, (index) => {
            index.events = [];
          }),
        ),
    ],
    [
      "final_state_requests_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteFinalState(receipt, root, (finalState) => {
            finalState.requests = [];
          }),
        ),
    ],
    [
      "evidence_root_binding_mismatch",
      (screen) =>
        rewriteEpisode(screen, (receipt, root) =>
          rewriteFinalState(receipt, root, (finalState) => {
            (finalState.binding as Record<string, unknown>).sequence = 2;
          }),
        ),
    ],
    [
      "screen_review_cell_mismatch",
      (screen) =>
        rewriteReview(screen, (review) => {
          const [cell] = review.cells;
          if (cell !== undefined) cell.securityFailures = ["isolation-9"];
        }),
    ],
    [
      "screen_review_summary_mismatch",
      (screen) =>
        rewriteReview(screen, (review) => {
          review.summaries = [];
        }),
    ],
  ];

  test.each(tampers)("%s", async (code, tamper) => {
    stubLatentScore();
    const screen = await completedScreen();
    await tamper(screen);
    expect(await failureOf(screen)).toBe(code);
  });

  test("a task fixture that cannot be read limits the report", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    const [task] = screen.lock.tasks as { id: string }[];
    await rm(
      join(
        screen.fixtureRunRoot,
        "public",
        "development",
        "tasks",
        task?.id ?? "",
        "workspace",
      ),
      { recursive: true },
    );
    const { report } = await runOfflineClassifierReanalysis({
      sourceRoot: screen.sourceRoot,
      fixtureRunRoot: screen.fixtureRunRoot,
      artifactRoot: screen.artifactRoot,
    });
    expect(report).toMatchObject({
      status: "limited",
      limitedReason: "source_manifests_unavailable",
      cells: [],
    });
  });

  test("a source file that disappears between checks is missing", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    const realLstat = fsPromises.lstat;
    let reviewChecks = 0;
    const spy = spyOn(fsPromises, "lstat").mockImplementation(((
      path: string,
    ) => {
      if (String(path).endsWith("screen-review.json")) {
        reviewChecks += 1;
        if (reviewChecks === 2)
          return Promise.reject(
            Object.assign(new Error("gone"), { code: "ENOENT" }),
          );
      }
      return realLstat(path);
    }) as never);
    restores.push(() => spy.mockRestore());
    expect(await failureOf(screen)).toBe("source_artifact_missing");
  });

  test("a screen outside its run layout is refused", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    const moved = join(screen.base, "elsewhere", RUN);
    await mkdir(join(screen.base, "elsewhere"));
    await Bun.$`mv ${screen.sourceRoot} ${moved}`.quiet();
    expect(await failureOf(screen, moved)).toBe("screen_root_layout_invalid");
  });

  test("an artifact root below a file is unavailable", async () => {
    stubLatentScore();
    const screen = await completedScreen();
    await writeFile(join(screen.base, "plain"), "x");
    expect(
      await failureOf(
        screen,
        screen.sourceRoot,
        join(screen.base, "plain", "out"),
      ),
    ).toBe("artifact_root_unavailable");
  });
});
