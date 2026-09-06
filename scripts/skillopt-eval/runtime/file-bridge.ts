import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import { CANONICAL_SKILLS } from "../catalog";
import {
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  Sha256Schema,
  canonicalJson,
  contractHash,
} from "../contracts/common";

const TaskIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/);
export const PublicTaskClaimSchema = z
  .object({
    taskId: TaskIdSchema,
    text: z.string().min(1).max(100_000),
    publicManifestHash: Sha256Schema,
    workspaceHash: Sha256Schema,
  })
  .strict();
const RowSchema = z
  .object({
    id: TaskIdSchema,
    hard: z.union([z.literal(0), z.literal(1)]),
    soft: z.number().min(0).max(1),
    status: z.enum([
      "completed",
      "behavioral-failure",
      "infrastructure-failure",
    ]),
    failureCategory: z.string().min(1).nullable(),
    failureCategories: z.array(z.string().min(1)).max(100).default([]),
    toolSequence: z.array(z.string().min(1).max(20_000)).max(100).default([]),
    finalStateSummary: z.string().max(20_000).default("{}"),
    conversationPath: z.string().min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const BridgeRequestSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("skillopt-bridge-request"),
    runId: z.uuid(),
    batchId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    skill: z.enum(CANONICAL_SKILLS),
    phase: z.enum(["train", "development", "held-out"]),
    candidateBody: z.string().min(1).max(100_000),
    taskIds: z.array(TaskIdSchema).length(1),
    publicClaim: PublicTaskClaimSchema,
    sourceLockHash: Sha256Schema,
  })
  .superRefine((request, context) => {
    const [taskId] = request.taskIds;
    if (taskId !== request.publicClaim.taskId) {
      context.addIssue({
        code: "custom",
        message: "public claim task identity must match the bridge task",
        path: ["publicClaim", "taskId"],
      });
    }
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const BridgeResultSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("skillopt-bridge-result"),
    runId: z.uuid(),
    batchId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    requestHash: Sha256Schema,
    rows: z.array(RowSchema).min(1).max(8),
    checkpoint: z
      .object({
        maxSteps: z.number().int().min(0),
        completedSteps: z.number().int().min(0),
        nextStep: z.number().int().min(1),
      })
      .strict(),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export type BridgeRequest = Readonly<z.infer<typeof BridgeRequestSchema>>;
export type PublicTaskClaim = Readonly<z.infer<typeof PublicTaskClaimSchema>>;
// implements REQ-skillopt-codex-optimization
export type BridgeResult = Readonly<z.infer<typeof BridgeResultSchema>>;

// implements REQ-skillopt-codex-optimization
export class BridgeVisibilityError extends Error {
  readonly name = "BridgeVisibilityError";
}

function canonicalText(value: unknown): string {
  return `${canonicalJson(JsonValueSchema.parse(value))}\n`;
}

async function atomicWrite(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, text, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

function assertRequestMatches(
  result: BridgeResult,
  request: BridgeRequest,
): void {
  if (result.runId !== request.runId || result.batchId !== request.batchId) {
    throw new BridgeVisibilityError("bridge_request_identity_mismatch");
  }
}

export function bindBridgeResult(
  result: BridgeResult,
  request: BridgeRequest,
): BridgeResult {
  const requestHash = contractHash(
    JsonValueSchema.parse(BridgeRequestSchema.parse(request)),
  );
  const parsed = BridgeResultSchema.parse({ ...result, requestHash });
  assertRequestMatches(parsed, request);
  return parsed;
}

// implements REQ-skillopt-codex-optimization
export async function writeBridgeRequest(
  path: string,
  request: BridgeRequest,
): Promise<string> {
  const parsed = BridgeRequestSchema.parse(request);
  const text = canonicalText(parsed);
  await atomicWrite(path, text);
  return contractHash(JsonValueSchema.parse(parsed));
}

// implements REQ-skillopt-codex-optimization
export async function readBridgeRequest(path: string): Promise<BridgeRequest> {
  return BridgeRequestSchema.parse(JSON.parse(await readFile(path, "utf8")));
}

// implements REQ-skillopt-codex-optimization
export async function writeBridgeResult(
  path: string,
  result: BridgeResult,
  request: BridgeRequest,
): Promise<string> {
  const parsed = bindBridgeResult(result, request);
  await atomicWrite(path, canonicalText(parsed));
  return parsed.requestHash;
}

// implements REQ-skillopt-codex-optimization
export async function readBridgeResult(
  path: string,
  request: BridgeRequest,
): Promise<BridgeResult> {
  const parsed = BridgeResultSchema.parse(
    JSON.parse(await readFile(path, "utf8")),
  );
  assertRequestMatches(parsed, request);
  const requestHash = contractHash(
    JsonValueSchema.parse(BridgeRequestSchema.parse(request)),
  );
  if (parsed.requestHash !== requestHash) {
    throw new BridgeVisibilityError("bridge_request_hash_mismatch");
  }
  if (new Set(parsed.rows.map(({ id }) => id)).size !== parsed.rows.length) {
    throw new BridgeVisibilityError("bridge_duplicate_task_id");
  }
  return parsed;
}

// implements REQ-skillopt-codex-optimization
export const FileBridge = class FileBridge {
  readonly #publicRoot: string;
  readonly #privateRoot: string;

  constructor(publicRoot: string, privateRoot: string) {
    this.#publicRoot = publicRoot;
    this.#privateRoot = privateRoot;
  }

  // implements REQ-skillopt-codex-optimization
  resolve(name: string, visibility: "public" | "private"): string {
    if (isAbsolute(name))
      throw new BridgeVisibilityError("absolute_bridge_path");
    const root = resolve(
      visibility === "public" ? this.#publicRoot : this.#privateRoot,
    );
    const path = resolve(root, name);
    const escaped = relative(root, path).startsWith("..");
    if (escaped) throw new BridgeVisibilityError("bridge_path_escape");
    return path;
  }

  // implements REQ-skillopt-codex-optimization
  async writePublic(name: string, content: string): Promise<void> {
    await atomicWrite(this.resolve(name, "public"), content);
  }

  // implements REQ-skillopt-codex-optimization
  async writePrivate(name: string, content: string): Promise<void> {
    await atomicWrite(this.resolve(name, "private"), content);
  }

  // implements REQ-skillopt-codex-optimization
  async readPublic(name: string): Promise<string> {
    return readFile(this.resolve(name, "public"), "utf8");
  }

  // implements REQ-skillopt-codex-optimization
  async readPrivate(name: string): Promise<string> {
    return readFile(this.resolve(name, "private"), "utf8");
  }
};

export type FileBridge = InstanceType<typeof FileBridge>;
