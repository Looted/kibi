import { readFileSync } from "node:fs";
import path from "node:path";
import { contextFinding } from "../../entity-body-context.js";
import { requirementSemanticText } from "../../extractors/markdown.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import type { UpsertInput } from "./types.js";

function readBody(workspaceRoot: string, source: unknown): string | undefined {
  if (typeof source !== "string" || !source.endsWith(".md")) return undefined;
  try {
    return (
      readAuthoredEntity(
        readFileSync(path.resolve(workspaceRoot, source), "utf8"),
        source,
      )?.body ?? undefined
    );
  } catch {
    return undefined;
  }
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
  writtenPath?: string,
): string {
  if (writtenPath !== undefined) {
    const written = readBody(workspaceRoot, writtenPath);
    if (written !== undefined) return written;
  }
  if (input.document?.body !== undefined) return input.document.body;
  const existing = readBody(
    workspaceRoot,
    input.document?.path ?? entity.source,
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
  writtenPath?: string,
): readonly string[] {
  const body = upsertDocumentBody(input, entity, workspaceRoot, writtenPath);
  const semanticText =
    typeof entity.semantic_text === "string" && entity.semantic_text.trim()
      ? entity.semantic_text
      : input.type === "req"
        ? requirementSemanticText(body)
        : undefined;
  const finding = contextFinding(input.type, input.id, body, {
    title: entity.title,
    semantic_text: semanticText,
    fact_kind: entity.fact_kind,
    tags: entity.tags,
  });
  return finding === null
    ? []
    : [
        `${finding.description}. kb_check blocks it under entity-context-missing. ${finding.suggestion}`,
      ];
}
