import { createHash } from "node:crypto";
import { open, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import {
  type EvidenceBinding,
  EvidenceBindingError,
  EvidenceBindingSchema,
  type PredicateCaseSnapshot,
  PredicateCaseSnapshotSchema,
  decodePredicateCaseSnapshot,
} from "../contracts/evidence";
import { redactJsonRpcValue } from "./jsonrpc";

const FINAL_STATE_TOOLS = [
  "kb_query",
  "kb_status",
  "kb_check",
  "kb_graph",
] as const;
const FinalStateToolSchema = z.enum(FINAL_STATE_TOOLS);
const FinalStateRequestSchema = z
  .object({
    tool: FinalStateToolSchema,
    args: z.record(z.string(), z.unknown()),
  })
  .strict();
const FinalStateOptionsSchema = z
  .object({
    launch: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()),
        cwd: z.string().min(1),
        env: z.record(z.string(), z.string()).optional(),
      })
      .strict(),
    receiptPath: z.string().min(1),
    requests: z.array(FinalStateRequestSchema).min(1),
    binding: EvidenceBindingSchema.optional(),
    timeoutMs: z.number().int().positive(),
  })
  .strict();

export type FinalStateOptions = Readonly<
  z.infer<typeof FinalStateOptionsSchema>
>;
// implements REQ-skillopt-predicate-first-requirements
export const FinalStateReceiptSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    workspaceRoot: z.string().min(1),
    binding: EvidenceBindingSchema.optional(),
    requests: z.array(
      z
        .object({
          tool: FinalStateToolSchema,
          args: z.record(z.string(), z.unknown()),
          result: z.unknown(),
          resultHash: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();
export type FinalStateReceipt = Readonly<
  z.infer<typeof FinalStateReceiptSchema>
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function structuredContent(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const content = value.structuredContent ?? value.structured_content;
  return isRecord(content) ? content : null;
}

function entityIdFromReference(value: string): string {
  return value.startsWith("kb:entity/")
    ? value.slice("kb:entity/".length)
    : value;
}

function relationshipTargets(value: unknown): readonly string[] {
  if (typeof value === "string") return [entityIdFromReference(value)];
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry === "string" ? [entityIdFromReference(entry)] : [],
  );
}

function strictPropertyValue(entity: Record<string, unknown>): string | null {
  for (const key of [
    "value_int",
    "value_number",
    "value_string",
    "value_bool",
  ] as const) {
    const value = entity[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }
  return null;
}

function qualifiedPropertyKey(entity: Record<string, unknown>): string | null {
  const propertyKey = entity.property_key;
  if (typeof propertyKey !== "string" || propertyKey.length === 0) return null;
  if (propertyKey.includes(".")) return propertyKey;
  const subjectKey = entity.subject_key;
  if (typeof subjectKey !== "string") return propertyKey;
  const separator = subjectKey.lastIndexOf(".");
  return separator < 0
    ? propertyKey
    : `${subjectKey.slice(0, separator)}.${propertyKey}`;
}

function factTarget(entity: Record<string, unknown>): string | null {
  switch (entity.fact_kind) {
    case "subject":
      return typeof entity.subject_key === "string" ? entity.subject_key : null;
    case "property_value": {
      const key = qualifiedPropertyKey(entity);
      const value = strictPropertyValue(entity);
      return key === null || value === null ? null : `${key}=${value}`;
    }
    case "predicate":
      return typeof entity.predicate_name === "string"
        ? entity.predicate_name
        : null;
    default:
      return null;
  }
}

function normalizeMcpPredicateSnapshot(
  value: unknown,
  binding: EvidenceBinding,
): PredicateCaseSnapshot {
  const content = structuredContent(value);
  const rawEntities = content?.entities;
  if (!Array.isArray(rawEntities)) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const entities = rawEntities.filter(isRecord);
  const factEntities = entities.filter(
    (entity) => entity.type === "fact" && typeof entity.id === "string",
  );
  const factById = new Map(
    factEntities.map((entity) => [String(entity.id), entity]),
  );
  const facts = factEntities.flatMap((entity) => {
    const factKind = entity.fact_kind;
    if (
      factKind !== "subject" &&
      factKind !== "property_value" &&
      factKind !== "predicate" &&
      factKind !== "predicate_schema" &&
      factKind !== "observation" &&
      factKind !== "meta"
    ) {
      return [];
    }
    const predicateArgs = Array.isArray(entity.predicate_args)
      ? entity.predicate_args.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    return [
      {
        id: String(entity.id),
        factKind,
        ...(typeof entity.canonical_key === "string"
          ? { canonicalKey: entity.canonical_key }
          : {}),
        ...(typeof entity.predicate_name === "string"
          ? { predicateName: entity.predicate_name }
          : {}),
        ...(predicateArgs === undefined ? {} : { predicateArgs }),
        ...(entity.polarity === "assert" || entity.polarity === "deny"
          ? { polarity: entity.polarity }
          : {}),
      },
    ];
  });
  const relationships = new Map<
    string,
    { relationship: string; target: string }
  >();
  const addRelationship = (relationship: string, target: string | null) => {
    if (target === null || target.length === 0) return;
    relationships.set(`${relationship}\u0000${target}`, {
      relationship,
      target,
    });
  };
  for (const entity of entities) {
    for (const relationship of [
      "requires_predicate",
      "constrains",
      "requires_property",
    ] as const) {
      for (const targetId of relationshipTargets(entity[relationship])) {
        const target = factById.get(targetId);
        if (target !== undefined)
          addRelationship(relationship, factTarget(target));
      }
    }
  }
  for (const entity of factEntities) {
    if (entity.fact_kind !== "observation") continue;
    const tags = Array.isArray(entity.tags) ? entity.tags : [];
    for (const tag of tags) {
      if (typeof tag === "string" && tag.startsWith("review:")) {
        addRelationship("relates_to", tag);
      }
    }
  }
  return PredicateCaseSnapshotSchema.parse({
    binding,
    facts,
    relationships: [...relationships.values()],
  });
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

async function writeDurableJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  const file = await open(temporary, "r");
  try {
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, path);
  const directory = await open(dirname(path), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

// implements REQ-skillopt-predicate-first-requirements
export function decodeFinalStatePredicateSnapshot(
  text: string,
  binding: EvidenceBinding,
): PredicateCaseSnapshot {
  let parsed: FinalStateReceipt;
  try {
    parsed = FinalStateReceiptSchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new EvidenceBindingError("malformed-snapshot");
    }
    throw error;
  }
  const snapshots = parsed.requests.filter(({ tool }) => tool === "kb_query");
  if (snapshots.length !== 1) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const snapshot = snapshots[0];
  if (snapshot === undefined) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const resultHash = createHash("sha256")
    .update(JSON.stringify(snapshot.result))
    .digest("hex");
  if (resultHash !== snapshot.resultHash) {
    throw new EvidenceBindingError("snapshot-hash");
  }
  const boundSnapshot = PredicateCaseSnapshotSchema.safeParse(snapshot.result);
  if (boundSnapshot.success) {
    return decodePredicateCaseSnapshot(boundSnapshot.data, binding);
  }
  if (parsed.binding === undefined) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  return decodePredicateCaseSnapshot(
    normalizeMcpPredicateSnapshot(snapshot.result, parsed.binding),
    binding,
  );
}

// implements REQ-skillopt-codex-optimization
export async function runIndependentFinalState(
  rawOptions: FinalStateOptions,
): Promise<FinalStateReceipt> {
  const options = FinalStateOptionsSchema.parse(rawOptions);
  const transport = new StdioClientTransport({
    command: options.launch.command,
    args: [...options.launch.args],
    cwd: options.launch.cwd,
    env: options.launch.env ?? stringEnvironment(process.env),
    stderr: "pipe",
  });
  const client = new Client({
    name: "skillopt-independent-final-state",
    version: "1.0.0",
  });
  const results: FinalStateReceipt["requests"][number][] = [];
  try {
    await client.connect(transport, { timeout: options.timeoutMs });
    const advertised = await client.listTools(undefined, {
      timeout: options.timeoutMs,
    });
    const toolNames = new Set(advertised.tools.map(({ name }) => name));
    for (const request of options.requests) {
      if (!toolNames.has(request.tool)) {
        throw new TypeError(`final_state_tool_unavailable:${request.tool}`);
      }
      const rawResult = await client.callTool(
        { name: request.tool, arguments: request.args },
        undefined,
        { timeout: options.timeoutMs },
      );
      const result = redactJsonRpcValue(rawResult);
      results.push({
        tool: request.tool,
        args: request.args,
        result,
        resultHash: createHash("sha256")
          .update(JSON.stringify(result))
          .digest("hex"),
      });
    }
  } finally {
    await client.close();
  }
  const receipt: FinalStateReceipt = {
    schemaVersion: "1.0.0",
    workspaceRoot: resolve(options.launch.cwd),
    ...(options.binding === undefined ? {} : { binding: options.binding }),
    requests: results,
  };
  await writeDurableJson(options.receiptPath, receipt);
  return receipt;
}
