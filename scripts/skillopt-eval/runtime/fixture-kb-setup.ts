import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { EngineClient } from "../../../packages/cli/src/engine";
import { buildUpsertCommitGoal } from "../../../packages/cli/src/operations/mutation/contradictions";
import { escapeAtom } from "../../../packages/cli/src/prolog/codec";

const execFileAsync = promisify(execFile);

export const FIXTURE_BRANCH = "skillopt-eval";

export class FixtureSetupError extends Error {
  override readonly name = "FixtureSetupError";
}

const COORDINATE_KEYS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
] as const;

// implements REQ-generated-coordinate-persistence
export function assertSymbolCoordinatesPresent(
  entity: Record<string, unknown>,
  symbolId: string,
): void {
  if (
    entity.id !== symbolId ||
    COORDINATE_KEYS.some((key) => typeof entity[key] !== "number")
  ) {
    throw new FixtureSetupError(
      `fixture symbol ${symbolId} must have generated coordinates before strip`,
    );
  }
}

// implements REQ-generated-coordinate-persistence
export function assertSymbolCoordinatesAbsent(
  entity: Record<string, unknown>,
  symbolId: string,
): void {
  if (
    entity.id !== symbolId ||
    COORDINATE_KEYS.some((key) => Object.hasOwn(entity, key))
  ) {
    throw new FixtureSetupError(
      `fixture symbol ${symbolId} must not have generated coordinates after strip`,
    );
  }
}

interface CliResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

async function runStagedCli(
  cliRoot: string,
  workspaceTarget: string,
  args: readonly string[],
  stdin?: string,
): Promise<CliResult> {
  const child = Bun.spawn(
    [process.execPath, join(cliRoot, "dist", "cli.js"), ...args],
    {
      cwd: workspaceTarget,
      env: { ...process.env, KIBI_BRANCH: FIXTURE_BRANCH },
      ...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { ok: exitCode === 0, stdout, stderr };
}

/**
 * Evaluator-owned precondition builder for the generated-coordinate repair
 * objective. Runs entirely outside the model sandbox using the staged
 * production CLI: author requirement + symbol through source-first upserts,
 * refresh + sync so artifact/cache/RDF all carry coordinates, commit tracked
 * setup files, then strip exactly the four coordinate literals through the
 * production commit path. Only the fixed forced-reassertion flow can repair
 * this state; the target model never gains direct `.kb` access.
 */
// implements REQ-skillopt-codex-optimization
export async function setupGeneratedCoordinateDivergence(
  workspaceTarget: string,
  cliRoot: string,
  symbolId: string,
): Promise<void> {
  const expectOk = async (
    result: CliResult,
    label: string,
  ): Promise<string> => {
    if (!result.ok) {
      throw new FixtureSetupError(
        `${label} failed: ${result.stderr.slice(0, 500) || result.stdout.slice(0, 200)}`,
      );
    }
    return result.stdout;
  };

  // Git identity on the evaluation branch; exclude runtime outputs.
  await execFileAsync("git", ["init", "-q", "-b", FIXTURE_BRANCH], {
    cwd: workspaceTarget,
  });
  for (const [key, value] of [
    ["user.email", "skillopt@eval"],
    ["user.name", "SkillOpt Evaluator"],
  ] as const) {
    await execFileAsync("git", ["config", key, value], {
      cwd: workspaceTarget,
    });
  }
  writeFileSync(
    join(workspaceTarget, ".git", "info", "exclude"),
    [
      ".runtime/",
      ".sandbox-home/",
      ".kb/branches/",
      ".kb/audit.log",
      ".kb/usage.log",
      ".kb/recovery/",
      "",
    ].join("\n"),
  );
  await execFileAsync(
    "git",
    ["commit", "-q", "--allow-empty", "-m", "fixture init"],
    { cwd: workspaceTarget },
  );

  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, ["init"]),
    "kibi init",
  );

  writeFileSync(
    join(workspaceTarget, "src", "fixture.ts"),
    "export function fixtureFamily() {\n  return true;\n}\n",
  );
  writeFileSync(
    join(workspaceTarget, ".kb", "symbols.yaml"),
    `symbols:
  - id: ${symbolId}
    title: fixtureFamily
    sourceFile: src/fixture.ts
    status: active
`,
  );

  const upsert = async (payload: unknown, label: string): Promise<void> => {
    await expectOk(
      await runStagedCli(
        cliRoot,
        workspaceTarget,
        ["upsert", "--input", "-"],
        JSON.stringify(payload),
      ),
      label,
    );
  };
  await upsert(
    {
      type: "req",
      id: "REQ-SETUP-COORD",
      properties: { title: "Coordinate fixture requirement", status: "open" },
      document: { path: ".kb/requirements/REQ-SETUP-COORD.md" },
    },
    "requirement upsert",
  );
  await upsert(
    {
      type: "symbol",
      id: symbolId,
      properties: {
        title: "fixtureFamily",
        status: "active",
        sourceFile: "src/fixture.ts",
      },
      relationships: [
        { type: "implements", from: symbolId, to: "REQ-SETUP-COORD" },
      ],
    },
    "symbol upsert",
  );

  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "sync",
      "--refresh-symbol-coordinates",
    ]),
    "refresh sync",
  );
  await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, ["sync"]),
    "import sync",
  );

  // Strip RDF coordinates with the production commit path.
  const queryOutput = await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "query",
      "symbol",
      "--format",
      "json",
    ]),
    "readback",
  );
  const parsed: unknown = JSON.parse(queryOutput);
  const entities = Array.isArray(parsed)
    ? parsed
    : ((parsed as { entities?: unknown[] }).entities ?? []);
  const entity = entities.find(
    (candidate): candidate is Record<string, unknown> =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as Record<string, unknown>).id === symbolId,
  );
  if (entity === undefined) {
    throw new FixtureSetupError("setup symbol missing after import sync");
  }
  assertSymbolCoordinatesPresent(entity, symbolId);

  await stripSymbolCoordinates(workspaceTarget, entity);

  const strippedOutput = await expectOk(
    await runStagedCli(cliRoot, workspaceTarget, [
      "query",
      "symbol",
      "--format",
      "json",
    ]),
    "stripped readback",
  );
  const strippedParsed: unknown = JSON.parse(strippedOutput);
  const strippedEntities = Array.isArray(strippedParsed)
    ? strippedParsed
    : ((strippedParsed as { entities?: unknown[] }).entities ?? []);
  const strippedEntity = strippedEntities.find(
    (candidate): candidate is Record<string, unknown> =>
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as Record<string, unknown>).id === symbolId,
  );
  if (strippedEntity === undefined) {
    throw new FixtureSetupError("setup symbol missing after coordinate strip");
  }
  assertSymbolCoordinatesAbsent(strippedEntity, symbolId);

  // Commit tracked setup content so the worktree is clean for the model.
  await execFileAsync("git", ["add", "-A"], { cwd: workspaceTarget });
  await execFileAsync(
    "git",
    ["commit", "-q", "-m", "evaluator fixture state"],
    { cwd: workspaceTarget },
  );
}

/** Remove exactly the four coordinate literals via production core. */
// implements REQ-skillopt-codex-optimization
export async function stripSymbolCoordinates(
  workspaceTarget: string,
  fullEntity: Record<string, unknown>,
): Promise<void> {
  const stripped: Record<string, unknown> = { ...fullEntity };
  for (const key of COORDINATE_KEYS) {
    delete stripped[key];
  }
  const daemon = new EngineClient({
    workspaceRoot: workspaceTarget,
    branch: FIXTURE_BRANCH,
    timeout: 5_000,
  });
  try {
    await daemon.stop(false);
  } catch {
    // No daemon was running.
  }
  await daemon.terminate();
  const { PrologProcess } = await import("../../../packages/cli/src/prolog.js");
  const prolog = new PrologProcess({ timeout: 120_000 });
  try {
    await prolog.start();
    // Resolve the exact branch store path through the locator contract.
    const { branchStorePath } = await import(
      "../../../packages/cli/src/utils/branch-store-locator.js"
    );
    const activeStorePath = branchStorePath(workspaceTarget, FIXTURE_BRANCH);
    const attached = await prolog.query(
      `kb_attach('${escapeAtom(activeStorePath)}')`,
    );
    if (!attached.success) {
      throw new FixtureSetupError(attached.error ?? "attach failed");
    }
    const written = await prolog.query(
      buildUpsertCommitGoal({
        entity: stripped,
        relationships: [],
        skipContradictionCheck: true,
      }),
    );
    if (!written.success) {
      throw new FixtureSetupError(written.error ?? "strip commit failed");
    }
    const detached = await prolog.query("kb_detach");
    if (!detached.success) {
      throw new FixtureSetupError(detached.error ?? "detach failed");
    }
  } finally {
    await prolog.terminate();
  }
}
