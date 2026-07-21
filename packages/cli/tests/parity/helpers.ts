import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type ContractEntity = {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly status: string;
  readonly source: string;
  readonly tags: readonly string[];
};

type ContractSeed = {
  readonly entities: readonly ContractEntity[];
};

// implements REQ-kibi-operation-interface-parity
export type ParityWorkspace = {
  readonly root: string;
  readonly cleanup: () => Promise<void>;
};

const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_BIN = path.join(REPOSITORY_ROOT, "packages/cli/bin/kibi");
const SEED_PATH = path.join(
  REPOSITORY_ROOT,
  "packages/mcp/tests/fixtures/contracts/seed/seed.json",
);

const VOLATILE_KEYS = new Set([
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
  "timestamp",
  "branch",
  "branchName",
  "snapshotId",
  "snapshot_id",
  "requestId",
  "request_id",
  "_diagnostic_telemetry",
  "elapsedMs",
  "usageLogLineNumber",
  "prologPid",
  "pid",
  "uuid",
]);

async function runWorkspaceCommand(
  root: string,
  command: readonly string[],
): Promise<void> {
  const child = Bun.spawn([...command], {
    cwd: root,
    env: { ...process.env, KIBI_WORKSPACE: root },
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(child.stderr).text();
    throw new Error(
      `Workspace command failed (${command.join(" ")}): ${stderr}`,
    );
  }
}

function entityDocument(entity: ContractEntity): string {
  return `---
id: ${entity.id}
type: ${entity.type}
title: ${entity.title}
status: ${entity.status}
source: ${entity.source}
tags: [${entity.tags.join(", ")}]
---

# ${entity.title}

Seed entity for semantic parity tests.
`;
}

// implements REQ-kibi-operation-interface-parity
export async function createParityWorkspace(): Promise<ParityWorkspace> {
  const root = await mkdtemp(path.join(os.tmpdir(), "kibi-parity-"));
  try {
    await runWorkspaceCommand(root, ["git", "init", "-b", "contracts-seed"]);
    await runWorkspaceCommand(root, [
      "bun",
      "run",
      KIBI_BIN,
      "init",
      "--no-hooks",
    ]);

    const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as ContractSeed;
    for (const entity of seed.entities) {
      const filePath = path.join(root, entity.source);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, entityDocument(entity), "utf8");
    }
    await runWorkspaceCommand(root, ["bun", "run", KIBI_BIN, "sync"]);
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }

  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

function normalizeString(
  value: string,
  workspaceRoots: readonly string[],
): string {
  let normalized = value;
  for (const root of [...workspaceRoots].sort(
    (left, right) => right.length - left.length,
  )) {
    normalized = normalized.replaceAll(root, "<workspace>");
  }
  return normalized
    .replaceAll(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      "<uuid>",
    )
    .replaceAll(/\b(?:prolog\s*)?pid\s*[=:]\s*\d+\b/gi, "pid=<pid>");
}

// implements REQ-kibi-operation-interface-parity
export function normalizeParityValue(
  value: unknown,
  workspaceRoots: readonly string[],
): unknown {
  if (typeof value === "string") {
    return normalizeString(value, workspaceRoots);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeParityValue(entry, workspaceRoots));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!VOLATILE_KEYS.has(key)) {
      normalized[key] = normalizeParityValue(entry, workspaceRoots);
    }
  }
  return normalized;
}
