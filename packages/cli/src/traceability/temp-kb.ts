import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isCliTraceOrDebugEnabled } from "../env.js";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../extractors/markdown.js";
import { PrologProcess } from "../prolog.js";
import { toPrologAtom, toPrologString } from "../prolog/codec.js";
import type { ExtractedSymbol } from "./symbol-extract";

export interface TempKbContext {
  tempDir: string;
  kbPath: string;
  overlayPath: string;
  prolog: PrologProcess;
}

const prologByTempDir = new Map<string, PrologProcess>();
const cleanupByTempDir = new Map<string, () => void>();
const cleanedTempDirs = new Set<string>();

/**
 * Reset module state - used by tests to clear state between test runs.
 * This is necessary because module-level Maps/Sets persist across tests.
 */
export function resetModuleState(): void {
  // implements REQ-014
  // Terminate all tracked prolog processes
  for (const prolog of prologByTempDir.values()) {
    void prolog.terminate().catch(() => {});
  }
  prologByTempDir.clear();
  cleanupByTempDir.clear();
  cleanedTempDirs.clear();
}

// Factory function for creating PrologProcess instances.
// Default uses the imported PrologProcess. Tests can override via _setPrologFactory
// to bypass mock.module() pollution from other test files.
let _createProlog = (opts: { timeout: number }) => new PrologProcess(opts);

/**
 * Override the PrologProcess factory — used by tests to inject the real constructor
 * when mock.module() has replaced the module-level binding.
 */
export function _setPrologFactory(
  // implements REQ-014
  factory: (opts: { timeout: number }) => PrologProcess,
): void {
  _createProlog = factory;
}
const FACT_ATOM_FIELDS = new Set([
  "fact_kind",
  "operator",
  "value_type",
  "polarity",
]);
const FACT_STRING_FIELDS = new Set([
  "subject_key",
  "property_key",
  "value_string",
  "unit",
  "scope",
  "valid_from",
  "valid_to",
  "canonical_key",
]);
const FACT_NUMBER_FIELDS = new Set(["value_int", "value_number"]);
const FACT_BOOLEAN_FIELDS = new Set(["value_bool", "closed_world"]);

function isTraceEnabled(): boolean {
  return isCliTraceOrDebugEnabled();
}

function trace(message: string): void {
  if (isTraceEnabled()) {
    // eslint-disable-next-line no-console
    console.log(`[kibi-trace] ${message}`);
  }
}

function escapePrologAtom(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function serializeTypedFactFields(entity: ExtractedEntity): string[] {
  const fields: string[] = [];
  const entityRecord = entity as unknown as Record<string, unknown>;

  for (const field of FACT_STRING_FIELDS) {
    const value = entityRecord[field];
    if (value !== undefined && value !== null) {
      fields.push(`${field}=${toPrologString(String(value))}`);
    }
  }

  for (const field of FACT_ATOM_FIELDS) {
    const value = entityRecord[field];
    if (value !== undefined && value !== null) {
      fields.push(`${field}=${toPrologAtom(String(value))}`);
    }
  }

  for (const field of FACT_NUMBER_FIELDS) {
    const value = entityRecord[field];
    if (value !== undefined && value !== null && typeof value === "number") {
      if (field === "value_int" && !Number.isInteger(value)) {
        continue;
      }
      fields.push(`${field}=${value}`);
    }
  }

  for (const field of FACT_BOOLEAN_FIELDS) {
    const value = entityRecord[field];
    if (value !== undefined && value !== null && typeof value === "boolean") {
      fields.push(`${field}=${value}`);
    }
  }

  return fields;
}

function buildEntityAssertionGoal(entity: ExtractedEntity): string {
  const props = [
    `id=${toPrologAtom(entity.id)}`,
    `title=${toPrologString(entity.title)}`,
    `status=${toPrologAtom(entity.status)}`,
    `created_at=${toPrologString(entity.created_at)}`,
    `updated_at=${toPrologString(entity.updated_at)}`,
    `source=${toPrologString(entity.source)}`,
  ];

  if (entity.tags && entity.tags.length > 0) {
    props.push(`tags=[${entity.tags.map(toPrologAtom).join(",")}]`);
  }
  if (entity.owner) props.push(`owner=${toPrologAtom(entity.owner)}`);
  if (entity.priority) props.push(`priority=${toPrologAtom(entity.priority)}`);
  if (entity.severity) props.push(`severity=${toPrologAtom(entity.severity)}`);
  if (entity.text_ref)
    props.push(`text_ref=${toPrologString(entity.text_ref)}`);

  if (entity.type === "fact") {
    props.push(...serializeTypedFactFields(entity));
  }

  return `kb_assert_entity(${entity.type}, [${props.join(", ")}])`;
}

function buildRelationshipAssertionGoal(
  relationship: ExtractedRelationship,
): string {
  return `kb_assert_relationship(${toPrologAtom(relationship.type)}, ${toPrologAtom(relationship.from)}, ${toPrologAtom(relationship.to)}, [])`;
}

function createCleanupHandler(tempDir: string): () => void {
  let inProgress = false;

  return () => {
    if (inProgress || cleanedTempDirs.has(tempDir)) {
      return;
    }
    inProgress = true;

    void cleanupTempKb(tempDir).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      trace(`cleanup on signal/exit failed for ${tempDir}: ${message}`);
    });
  };
}

function registerCleanupHandlers(tempDir: string): void {
  const handler = createCleanupHandler(tempDir);

  process.once("exit", handler);
  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);

  cleanupByTempDir.set(tempDir, () => {
    process.off("exit", handler);
    process.off("SIGINT", handler);
    process.off("SIGTERM", handler);
  });
}

async function consultOverlay(ctx: TempKbContext): Promise<void> {
  const prolog = prologByTempDir.get(ctx.tempDir);
  if (!prolog) {
    throw new Error(`No Prolog session found for temp dir: ${ctx.tempDir}`);
  }

  const consultResult = await prolog.query([
    `consult(${escapePrologAtom(ctx.overlayPath)})`,
    "kb_save",
  ]);

  if (!consultResult.success) {
    throw new Error(
      `Failed to consult overlay facts ${ctx.overlayPath}: ${consultResult.error || "unknown error"}`,
    );
  }
}

export { consultOverlay };

// implements REQ-014
export async function projectStagedEntities(
  prolog: PrologProcess,
  results: ExtractionResult[],
): Promise<void> {
  for (const { entity } of results) {
    const retractResult = await prolog.query(
      `kb_retract_entity(${toPrologAtom(entity.id)})`,
    );
    if (!retractResult.success) {
      throw new Error(
        `Failed to retract staged entity ${entity.id}: ${retractResult.error || "unknown error"}`,
      );
    }

    const assertEntityResult = await prolog.query(
      buildEntityAssertionGoal(entity),
    );
    if (!assertEntityResult.success) {
      throw new Error(
        `Failed to assert staged entity ${entity.id}: ${assertEntityResult.error || "unknown error"}`,
      );
    }
  }

  for (const { relationships } of results) {
    for (const relationship of relationships) {
      const assertRelationshipResult = await prolog.query(
        buildRelationshipAssertionGoal(relationship),
      );
      if (!assertRelationshipResult.success) {
        throw new Error(
          `Failed to assert staged relationship ${relationship.type} ${relationship.from} -> ${relationship.to}: ${assertRelationshipResult.error || "unknown error"}`,
        );
      }
    }
  }
}

export async function createTempKb(baseKbPath: string): Promise<TempKbContext> {
  // implements REQ-014
  if (!existsSync(baseKbPath)) {
    throw new Error(`Base KB path does not exist: ${baseKbPath}`);
  }

  // Use crypto.randomUUID() for uniqueness across concurrent calls
  const tempDir = path.join(
    tmpdir(),
    `kibi-precommit-${process.pid}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  );
  const kbPath = path.join(tempDir, "kb");
  const overlayPath = path.join(tempDir, "changed_symbols.pl");

  trace(`creating temp KB directory ${tempDir}`);
  await mkdir(tempDir, { recursive: true });

  trace(`copying base KB ${baseKbPath} -> ${kbPath}`);
  await cp(baseKbPath, kbPath, { recursive: true });

  await writeFile(overlayPath, "", "utf8");

  const prolog = _createProlog({ timeout: 120000 });
  await prolog.start();
  prologByTempDir.set(tempDir, prolog);

  // ctx includes prolog so callers can use it directly
  const ctx: TempKbContext = { tempDir, kbPath, overlayPath, prolog };

  registerCleanupHandlers(tempDir);

  const attachResult = await prolog.query(
    `kb_attach(${escapePrologAtom(kbPath)})`,
  );
  if (!attachResult.success) {
    await cleanupTempKb(tempDir);
    throw new Error(
      `Failed to attach temporary KB at ${kbPath}: ${attachResult.error || "unknown error"}`,
    );
  }

  // Caller is expected to write overlay facts and then call consultOverlay(ctx).
  trace(`temporary KB ready at ${kbPath}`);

  return ctx;
}

// implements REQ-014
export function createOverlayFacts(symbols: ExtractedSymbol[]): string {
  const lines: string[] = [];

  for (const symbol of symbols) {
    lines.push(`kb:changed_symbol(${escapePrologAtom(symbol.id)}).`);
    lines.push(
      `kb:changed_symbol_loc(${escapePrologAtom(symbol.id)}, ${escapePrologAtom(symbol.location.file)}, ${symbol.location.startLine}, 0, ${escapePrologAtom(symbol.name)}).`,
    );

    // Emit overlay facts for requirement links from code-comment directives.
    for (const reqId of symbol.reqLinks) {
      lines.push(
        `kb:changed_symbol_req(${escapePrologAtom(symbol.id)}, ${escapePrologAtom(reqId)}).`,
      );
    }
  }

  return lines.join("\n");
}

export async function cleanupTempKb(tempDir: string): Promise<void> {
  if (cleanedTempDirs.has(tempDir)) {
    return;
  }
  cleanedTempDirs.add(tempDir);

  const unregister = cleanupByTempDir.get(tempDir);
  if (unregister) {
    unregister();
    cleanupByTempDir.delete(tempDir);
  }

  const prolog = prologByTempDir.get(tempDir);
  if (prolog) {
    try {
      await prolog.query("kb_detach");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      trace(`kb_detach failed during cleanup for ${tempDir}: ${message}`);
    }

    await prolog.terminate();
    prologByTempDir.delete(tempDir);
  }

  await rm(tempDir, { recursive: true, force: true });
  trace(`removed temporary KB directory ${tempDir}`);
}
