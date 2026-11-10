import { readFileSync } from "node:fs";
import path from "node:path";
import { contextFinding } from "../../entity-body-context.js";
import { requirementSemanticText } from "../../extractors/markdown.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import type { UpsertInput } from "./types.js";

function readBody(workspaceRoot: string, source: unknown): string | undefined {
  if (typeof source !== "string" || !source.endsWith(".md")) return undefined;
  let content: string;
  try {
    content = readFileSync(path.resolve(workspaceRoot, source), "utf8");
  } catch {
    return undefined;
  }
  return readAuthoredEntity(content, source)?.body;
}

/**
 * Where the upsert's authored document lives. `writtenPath` is the file a
 * real write just published; `targetPath` is the file a write would update
 * (a dry run resolves it the same way the write does, because the preview
 * entity's `source` is the runtime marker rather than the authored file).
 */
export interface UpsertDocumentPaths {
  readonly writtenPath?: string | undefined;
  readonly targetPath?: string | undefined;
}

/**
 * The body the authored document has, or will have, after this upsert: the
 * written file when there is one, the supplied body, the preserved body of
 * the entity's existing document, or the default a new requirement gets.
 */
// implements REQ-kb-entity-body-context
export function upsertDocumentBody(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  workspaceRoot: string,
  paths: UpsertDocumentPaths = {},
): string {
  // readBody answers undefined for a missing path, too.
  const written = readBody(workspaceRoot, paths.writtenPath);
  if (written !== undefined) return written;
  if (input.document?.body !== undefined) return input.document.body;
  const existing = readBody(
    workspaceRoot,
    input.document?.path ?? paths.targetPath ?? entity.source,
  );
  if (existing !== undefined) return existing;
  return input.type === "req" ? `${String(entity.semantic_text ?? "")}\n` : "";
}

/**
 * kb_upsert warning for a written entity whose body lacks context. The same
 * finding blocks `kb_check` as entity-context-missing, so agents see it first.
 */
// implements REQ-kb-entity-body-context
export function entityContextWarnings(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  workspaceRoot: string,
  paths: UpsertDocumentPaths = {},
): readonly string[] {
  const body = upsertDocumentBody(input, entity, workspaceRoot, paths);
  const semanticText =
    typeof entity.semantic_text === "string" && entity.semantic_text.trim()
      ? entity.semantic_text
      : // Only a requirement's finding reads semantic_text, so other types
        // may carry the derived statement unused.
        requirementSemanticText(body);
  const acknowledged =
    readKbManifest(workspaceRoot)?.contextAcknowledged?.includes(input.id) ===
    true;
  const finding = contextFinding(
    input.type,
    input.id,
    body,
    {
      title: entity.title,
      semantic_text: semanticText,
      fact_kind: entity.fact_kind,
    },
    acknowledged,
  );
  return finding === null
    ? []
    : [
        `${finding.description}. kb_check blocks it under entity-context-missing. ${finding.suggestion}`,
      ];
}
