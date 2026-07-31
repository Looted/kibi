import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  parseCorpusIndexValue,
  parseHeldOutTaskManifest,
  parsePublicTaskManifest,
} from "../fixtures/contracts";
import { parsePrivateEvaluatorManifest } from "../fixtures/evaluator-contracts";
import {
  type FixtureAuthorizationClaim,
  assertFixtureAuthorizationClaim,
  buildFixtureAuthorizationClaim,
} from "../fixtures/fixture-claim";
import type { PublicTaskClaim } from "./file-bridge";

const TASK_ID = /^[a-z0-9][a-z0-9-]{0,127}$/;

type FixtureLocation = Readonly<{
  readonly splitRoot: string;
  readonly visibility: "public" | "held-out";
  readonly split: "train" | "development" | "held-out";
}>;

type TaskFixture = Readonly<{
  readonly publicClaim: PublicTaskClaim;
  readonly workspaceRoot: string;
  readonly workspaceHash: string;
  readonly evaluatorManifest: ReturnType<typeof parsePrivateEvaluatorManifest>;
  readonly fixtureClaim: FixtureAuthorizationClaim;
}>;

export class TaskFixtureResolutionError extends Error {
  readonly name = "TaskFixtureResolutionError";

  constructor(readonly code: string) {
    super(code);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertTaskId(taskId: string): void {
  if (!TASK_ID.test(taskId)) {
    throw new TaskFixtureResolutionError("invalid_task_fixture_id");
  }
}

function assertNestedPath(root: string, target: string): void {
  if (relative(root, target).startsWith("..")) {
    throw new TaskFixtureResolutionError("task_fixture_path_escape");
  }
}

function locateTask(runRoot: string, taskId: string): FixtureLocation {
  const locations: readonly FixtureLocation[] = [
    {
      splitRoot: join(runRoot, "public", "train"),
      visibility: "public",
      split: "train",
    },
    {
      splitRoot: join(runRoot, "public", "development"),
      visibility: "public",
      split: "development",
    },
    {
      splitRoot: join(runRoot, "held-out"),
      visibility: "held-out",
      split: "held-out",
    },
  ];
  const matches = locations.filter(({ splitRoot }) =>
    existsSync(join(splitRoot, "tasks", taskId, "task.json")),
  );
  const [match] = matches;
  if (matches.length !== 1 || match === undefined) {
    throw new TaskFixtureResolutionError("task_fixture_not_found");
  }
  return match;
}

// implements REQ-skillopt-codex-optimization
export async function resolveTaskFixture(input: {
  readonly fixtureRunRoot: string;
  readonly taskId: string;
  readonly publicClaim: PublicTaskClaim;
  /** When provided, local materialization alone is not authorizing. */
  readonly authorizationClaim?: unknown;
}): Promise<TaskFixture> {
  assertTaskId(input.taskId);
  assertTaskId(input.publicClaim.taskId);
  if (input.taskId !== input.publicClaim.taskId) {
    throw new TaskFixtureResolutionError("public_claim_task_mismatch");
  }

  const runRoot = await realpath(input.fixtureRunRoot);
  const location = locateTask(runRoot, input.taskId);
  const taskRoot = await realpath(
    join(location.splitRoot, "tasks", input.taskId),
  );
  assertNestedPath(runRoot, taskRoot);
  const workspaceRoot = await realpath(join(taskRoot, "workspace"));
  assertNestedPath(taskRoot, workspaceRoot);
  const publicText = await readFile(join(taskRoot, "task.json"), "utf8");
  const publicManifest =
    location.visibility === "public"
      ? parsePublicTaskManifest(publicText)
      : parseHeldOutTaskManifest(publicText);
  const publicManifestHash = sha256(publicText);

  if (
    publicManifest.task.id !== input.taskId ||
    publicManifestHash !== input.publicClaim.publicManifestHash ||
    publicManifest.workspaceHash !== input.publicClaim.workspaceHash ||
    publicManifest.task.prompt !== input.publicClaim.text
  ) {
    throw new TaskFixtureResolutionError("public_task_fixture_mismatch");
  }

  const evaluatorRoot = await realpath(join(runRoot, "evaluator"));
  assertNestedPath(runRoot, evaluatorRoot);
  const privateText = await readFile(
    join(evaluatorRoot, "manifests", `${input.taskId}.json`),
    "utf8",
  );
  const evaluatorManifest = parsePrivateEvaluatorManifest(privateText);
  const evaluatorManifestHash = sha256(privateText);
  const privateIndex = parseCorpusIndexValue(
    JSON.parse(
      await readFile(join(evaluatorRoot, "evaluator-manifest.json"), "utf8"),
    ),
  );
  const privateEntries = privateIndex.tasks.filter(
    (entry) => entry.taskId === input.taskId,
  );
  const [privateEntry] = privateEntries;
  if (
    privateEntries.length !== 1 ||
    privateEntry === undefined ||
    privateEntry.manifestHash !== evaluatorManifestHash ||
    privateEntry.workspaceHash !== publicManifest.workspaceHash ||
    evaluatorManifest.taskId !== input.taskId ||
    evaluatorManifest.publicManifestHash !== publicManifestHash ||
    evaluatorManifest.workspaceHash !== publicManifest.workspaceHash
  ) {
    throw new TaskFixtureResolutionError("private_task_fixture_mismatch");
  }

  const expectedClaim = {
    taskId: input.taskId,
    split: location.split,
    family: publicManifest.task.family,
    publicManifestHash,
    workspaceHash: publicManifest.workspaceHash,
    evaluatorManifestHash,
  };
  const fixtureClaim =
    input.authorizationClaim === undefined
      ? buildFixtureAuthorizationClaim(expectedClaim)
      : assertFixtureAuthorizationClaim(
          input.authorizationClaim,
          expectedClaim,
        );

  return {
    publicClaim: input.publicClaim,
    workspaceRoot,
    workspaceHash: publicManifest.workspaceHash,
    evaluatorManifest,
    fixtureClaim,
  };
}
