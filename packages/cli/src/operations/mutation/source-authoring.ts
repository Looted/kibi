import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { parseDocument, stringify } from "yaml";
import { OperationError } from "../../cli-errors.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  CANONICAL_ENTITY_PATHS,
  isDerivedKbPath,
} from "../../utils/kb-paths.js";
import type { RelationshipInput, UpsertInput } from "./types.js";

export type SourceWriteReceipt = Readonly<{
  path: string;
  mode: "write" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  created: boolean;
}>;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pendingReceiptPath(
  workspaceRoot: string,
  relativePath: string,
): string {
  return path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    "pending-sources",
    `${digest(relativePath)}.json`,
  );
}

export function writePendingSourceReceipt(
  workspaceRoot: string,
  relativePath: string,
  afterHash: string,
): void {
  const receiptPath = pendingReceiptPath(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        version: 1,
        path: relativePath,
        afterHash,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

function authoredPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.replaceAll("\\", "/");
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)) return undefined;
  if (!/\.(?:md|mdx|ya?ml)$/i.test(normalized)) return undefined;
  return normalized;
}

export function resolveContainedSourcePath(
  workspaceRoot: string,
  relative: string,
): string {
  if (
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((part) => part === ".." || part === "")
  ) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path must be a workspace-relative path without traversal: ${relative}`,
    );
  }
  const absolute = path.resolve(workspaceRoot, relative);
  const root = path.resolve(workspaceRoot);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path escapes the workspace: ${relative}`,
    );
  }
  const workspaceRelative = path
    .relative(root, absolute)
    .replaceAll(path.sep, "/");
  if (isDerivedKbPath(workspaceRelative)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path cannot target Kibi's derived state under ${workspaceRelative}: ${relative}`,
    );
  }
  // A symlinked existing file or parent could otherwise escape the workspace.
  let existing = fs.existsSync(absolute) ? absolute : path.dirname(absolute);
  while (!fs.existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing);
  }
  const real = fs.realpathSync.native(existing);
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path resolves outside the workspace: ${relative}`,
    );
  }
  return absolute;
}

export function normalizeAuthoredSourcePath(
  workspaceRoot: string,
  source: string,
): string {
  const normalized = source.replaceAll("\\", "/");
  const relative = path.isAbsolute(normalized)
    ? path.relative(path.resolve(workspaceRoot), path.resolve(normalized))
    : normalized;
  return path
    .relative(
      path.resolve(workspaceRoot),
      resolveContainedSourcePath(workspaceRoot, relative),
    )
    .replaceAll(path.sep, "/");
}

function bodyAndFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!content.startsWith("---")) return { frontmatter: {}, body: content };
  const firstEnd = content.indexOf("\n", 3);
  if (firstEnd < 0) return { frontmatter: {}, body: content };
  const marker = content.indexOf("\n---", firstEnd);
  if (marker < 0) return { frontmatter: {}, body: content };
  const raw = content.slice(firstEnd + 1, marker);
  const parsed = loadYaml(raw);
  return {
    frontmatter:
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {},
    body: content.slice(marker + "\n---".length),
  };
}

/**
 * Canonical authored target for an entity type: `.kb/<lane>/<ID>.md` for
 * markdown entities and `.kb/symbols.yaml` for symbols. Kibi owns these
 * locations; repositories cannot relocate them.
 */
export function configuredSourceTarget(
  workspaceRoot: string,
  type: string,
): string | undefined {
  const laneByType: Record<string, string | undefined> = {
    req: CANONICAL_ENTITY_PATHS.requirements,
    scenario: CANONICAL_ENTITY_PATHS.scenarios,
    test: CANONICAL_ENTITY_PATHS.tests,
    adr: CANONICAL_ENTITY_PATHS.adr,
    flag: CANONICAL_ENTITY_PATHS.flags,
    event: CANONICAL_ENTITY_PATHS.events,
    fact: CANONICAL_ENTITY_PATHS.facts,
    symbol: CANONICAL_ENTITY_PATHS.symbols,
  };
  return laneByType[type];
}

export function hasConfiguredSourceTarget(
  workspaceRoot: string,
  type: string,
): boolean {
  return configuredSourceTarget(workspaceRoot, type) !== undefined;
}

function sourcePath(
  context: OperationContext,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing: Readonly<Record<string, unknown>> | undefined,
): string {
  const requested = input.document?.path;
  const canonical = configuredSourceTarget(context.workspaceRoot, input.type);
  let relative: string | undefined =
    requested ?? authoredPath(existing?.source);
  // Canonical markdown lanes name a directory; append the entity's file so
  // upserts without document.path land in the canonical location.
  if (
    relative === undefined &&
    canonical !== undefined &&
    !/\.(?:md|mdx|ya?ml)$/i.test(canonical)
  ) {
    relative = `${canonical}/${String(entity.id)}.md`;
  } else if (relative === undefined && canonical !== undefined) {
    relative = canonical;
  }
  if (!relative) {
    throw new OperationError(
      "DOCUMENT_PATH_REQUIRED",
      `No writable source target is available for ${input.type}; provide document.path explicitly`,
    );
  }
  // Extracted entities may carry an absolute source path even though the
  // authored document contract is workspace-relative. Rebase paths that are
  // inside the workspace before applying containment and symlink checks.
  if (path.isAbsolute(relative)) {
    const root = path.resolve(context.workspaceRoot);
    const absolute = path.resolve(relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
      throw new OperationError(
        "SOURCE_PATH_INVALID",
        `document.path resolves outside the workspace: ${relative}`,
      );
    }
    relative = path.relative(root, absolute).replaceAll(path.sep, "/");
  }
  return resolveContainedSourcePath(context.workspaceRoot, relative);
}

function renderEntityDocument(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existingContent: string | undefined,
): string {
  const existing = existingContent
    ? bodyAndFrontmatter(existingContent)
    : { frontmatter: {}, body: "" };
  const body =
    input.document?.body !== undefined
      ? input.document.body
      : existingContent !== undefined
        ? existing.body
        : input.type === "req"
          ? `${String(entity.semantic_text ?? "").trim()}\n`
          : "\n";
  const frontmatter = {
    ...existing.frontmatter,
    ...Object.fromEntries(
      Object.entries(entity).filter(
        ([key]) =>
          // Runtime provenance/timestamps belong to the compiled entity, not to
          // the authored source artifact. Keeping them out also makes the source
          // diff deterministic across CLI and MCP transports.
          ![
            "id",
            "type",
            "source",
            "links",
            "relationships",
            "created_at",
            "updated_at",
          ].includes(key),
      ),
    ),
  };
  frontmatter.id = entity.id;
  frontmatter.title ??= entity.id;
  frontmatter.type = entity.type;
  return `---\n${dumpYaml(frontmatter, { noRefs: true, lineWidth: -1, sortKeys: false })}---${body.startsWith("\n") ? "" : "\n"}${body}`;
}

function symbolManifestRecord(
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly Readonly<{ type: string; target: string }>[] = [],
): Record<string, unknown> {
  const record = Object.fromEntries(
    Object.entries(entity).filter(
      ([key]) =>
        ![
          "type",
          "source",
          "relationships",
          "created_at",
          "updated_at",
        ].includes(key),
    ),
  );
  if (relationships.length > 0) {
    record.relationships = relationships.map(({ type, target }) => ({
      type,
      target,
    }));
  }
  return record;
}

function manifestRelationships(
  item: unknown,
): Array<{ type: string; target: string }> {
  if (
    item === null ||
    typeof item !== "object" ||
    !("get" in item) ||
    typeof (item as { get?: unknown }).get !== "function"
  ) {
    return [];
  }
  const sequence = (
    item as { get(key: string, keepCst?: boolean): unknown }
  ).get("relationships", true);
  if (
    sequence === null ||
    typeof sequence !== "object" ||
    !("toJSON" in sequence) ||
    typeof (sequence as { toJSON?: unknown }).toJSON !== "function"
  ) {
    return [];
  }
  const value = (sequence as { toJSON(): unknown }).toJSON();
  if (!Array.isArray(value)) return [];
  return value.flatMap((relationship) => {
    if (relationship === null || typeof relationship !== "object") {
      return [];
    }
    const candidate = relationship as Record<string, unknown>;
    const type = candidate.type;
    const target = candidate.target ?? candidate.to;
    return typeof type === "string" && typeof target === "string"
      ? [{ type, target }]
      : [];
  });
}

function mergeManifestRelationships(
  existing: readonly Readonly<{ type: string; target: string }>[],
  incoming: readonly RelationshipInput[],
  entityId: string,
): Array<{ type: string; target: string }> {
  const merged = new Map<string, { type: string; target: string }>();
  for (const relationship of existing) {
    merged.set(`${relationship.type}\u0000${relationship.target}`, {
      type: relationship.type,
      target: relationship.target,
    });
  }
  for (const relationship of incoming) {
    if (
      relationship.from !== entityId ||
      typeof relationship.type !== "string" ||
      typeof relationship.to !== "string"
    ) {
      continue;
    }
    const normalized = { type: relationship.type, target: relationship.to };
    merged.set(`${normalized.type}\u0000${normalized.target}`, normalized);
  }
  return [...merged.values()].sort((left, right) =>
    `${left.type}\u0000${left.target}`.localeCompare(
      `${right.type}\u0000${right.target}`,
    ),
  );
}

function renderSymbolManifest(
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  existingContent: string | undefined,
): string {
  if (existingContent === undefined) {
    const doc = parseDocument(
      stringify({
        symbols: [
          symbolManifestRecord(
            entity,
            mergeManifestRelationships([], relationships, String(entity.id)),
          ),
        ],
      }),
    );
    return doc.toString();
  }
  const doc = parseDocument(existingContent);
  const symbols = doc.get("symbols", true);
  if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      "Symbol manifest must contain a symbols array",
    );
  }
  const items = (symbols as { items: unknown[] }).items;
  const id = String(entity.id);
  const index = items.findIndex((item) => {
    if (!item || typeof item !== "object" || !("get" in item)) return false;
    return String((item as { get(key: string): unknown }).get("id")) === id;
  });
  const existingRelationships =
    index >= 0 ? manifestRelationships(items[index]) : [];
  const next = symbolManifestRecord(
    entity,
    mergeManifestRelationships(existingRelationships, relationships, id),
  );
  if (index >= 0) {
    doc.setIn(["symbols", index], next);
  } else {
    doc.addIn(["symbols"], next);
  }
  return doc.toString();
}

export function renderSourceDeletion(
  sourcePathValue: string,
  entityId: string,
  entityType: string,
  existingContent: string,
): { mode: "write" | "delete"; body?: string } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension === ".md" || extension === ".mdx") {
    const parsed = bodyAndFrontmatter(existingContent);
    if (String(parsed.frontmatter.id ?? "") !== entityId) {
      throw new OperationError(
        "SOURCE_ENTITY_MISMATCH",
        `Authored document ${sourcePathValue} does not contain ${entityId}`,
      );
    }
    return { mode: "delete" };
  }
  if (extension === ".yaml" || extension === ".yml") {
    if (entityType !== "symbol") {
      throw new OperationError(
        "SOURCE_FORMAT_UNSUPPORTED",
        `YAML deletion is supported only for symbol manifests, not ${entityType}`,
      );
    }
    const doc = parseDocument(existingContent);
    const symbols = doc.get("symbols", true);
    if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
      throw new OperationError(
        "SOURCE_FORMAT_INVALID",
        "Symbol manifest must contain a symbols array",
      );
    }
    const items = (symbols as { items: unknown[] }).items;
    const index = items.findIndex((item) => {
      if (!item || typeof item !== "object" || !("get" in item)) return false;
      return (
        String((item as { get(key: string): unknown }).get("id")) === entityId
      );
    });
    if (index < 0) {
      throw new OperationError(
        "SOURCE_ENTITY_MISMATCH",
        `Symbol manifest ${sourcePathValue} does not contain ${entityId}`,
      );
    }
    doc.deleteIn(["symbols", index]);
    return { mode: "write", body: doc.toString() };
  }
  throw new OperationError(
    "SOURCE_FORMAT_UNSUPPORTED",
    `Unsupported authored source format: ${extension || "unknown"}`,
  );
}

/**
 * Remove one legacy relationship declaration from an authored Markdown
 * document.  Relationship shards are the canonical relationship lane, but
 * older entity documents may still carry `links` or typed `relationships`
 * frontmatter.  When such a declaration is explicitly deleted, patch only
 * that record through the YAML CST so comments, ordering, and the Markdown
 * body remain byte-stable.
 */
export function renderMarkdownRelationshipDeletion(
  sourcePathValue: string,
  existingContent: string,
  selector: Readonly<{ type: string; from: string; to: string }>,
): { body: string; removed: boolean } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension !== ".md" && extension !== ".mdx") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Relationship declarations can only be patched in Markdown documents: ${sourcePathValue}`,
    );
  }
  if (!existingContent.startsWith("---"))
    return { body: existingContent, removed: false };
  const firstEnd = existingContent.indexOf("\n", 3);
  if (firstEnd < 0) return { body: existingContent, removed: false };
  const marker = existingContent.indexOf("\n---", firstEnd);
  if (marker < 0) return { body: existingContent, removed: false };
  const frontmatter = parseDocument(
    existingContent.slice(firstEnd + 1, marker),
  );
  let removed = false;
  for (const key of ["links", "relationships"] as const) {
    const sequence = frontmatter.get(key, true);
    if (!sequence || typeof sequence !== "object" || !("items" in sequence))
      continue;
    const items = (sequence as { items: unknown[] }).items;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (!item || typeof item !== "object") continue;
      if (key === "links" && !("get" in item)) {
        const scalar = item as { toJSON?: () => unknown; value?: unknown };
        const value = scalar.toJSON?.() ?? scalar.value;
        if (
          typeof value === "string" &&
          value.replace(/^kb:entity\//, "") === selector.to
        ) {
          frontmatter.deleteIn([key, index]);
          removed = true;
        }
        continue;
      }
      if (!("get" in item)) continue;
      const node = item as { get(name: string): unknown };
      const target = node.get("target") ?? node.get("to");
      const relationType = node.get("type");
      const matches =
        typeof target === "string" &&
        target.replace(/^kb:entity\//, "") === selector.to &&
        (key === "links" ||
          relationType === selector.type ||
          relationType === undefined);
      if (matches) {
        frontmatter.deleteIn([key, index]);
        removed = true;
      }
    }
  }
  if (!removed) return { body: existingContent, removed: false };
  const body = existingContent.slice(marker + "\n---".length);
  return {
    body: `---\n${frontmatter.toString()}---${body.startsWith("\n") ? "" : "\n"}${body}`,
    removed: true,
  };
}

/**
 * Remove one exact typed relationship from an authored symbol manifest. The
 * YAML CST is edited in place so comments, ordering, and unrelated symbols or
 * relationships remain authored content rather than being re-serialized.
 */
export function renderYamlRelationshipDeletion(
  sourcePathValue: string,
  existingContent: string,
  selector: Readonly<{ type: string; from: string; to: string }>,
): { body: string; removed: boolean } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension !== ".yaml" && extension !== ".yml") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Relationship declarations can only be patched in YAML symbol manifests: ${sourcePathValue}`,
    );
  }
  const doc = parseDocument(existingContent);
  if (doc.errors.length > 0) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      `Symbol manifest contains invalid YAML: ${doc.errors[0]?.message ?? "parse failed"}`,
    );
  }
  const symbols = doc.get("symbols", true);
  if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      "Symbol manifest must contain a symbols array",
    );
  }
  const items = (symbols as { items: unknown[] }).items;
  const symbol = items.find((item) => {
    if (!item || typeof item !== "object" || !("get" in item)) return false;
    return (
      String((item as { get(key: string): unknown }).get("id")) ===
      selector.from
    );
  });
  if (!symbol || typeof symbol !== "object" || !("get" in symbol)) {
    return { body: existingContent, removed: false };
  }
  const relationships = (
    symbol as { get(key: string, keepCst?: boolean): unknown }
  ).get("relationships", true);
  if (
    !relationships ||
    typeof relationships !== "object" ||
    !("items" in relationships)
  ) {
    return { body: existingContent, removed: false };
  }
  const relationshipItems = (relationships as { items: unknown[] }).items;
  let removed = false;
  for (let index = relationshipItems.length - 1; index >= 0; index -= 1) {
    const item = relationshipItems[index];
    if (!item || typeof item !== "object" || !("get" in item)) continue;
    const node = item as { get(key: string): unknown };
    const type = node.get("type");
    const target = node.get("target") ?? node.get("to");
    const normalizedTarget =
      typeof target === "string"
        ? target.replace(/^kb:entity\//, "")
        : undefined;
    if (type === selector.type && normalizedTarget === selector.to) {
      (relationships as unknown as { delete(index: number): unknown }).delete(
        index,
      );
      removed = true;
    }
  }
  return removed
    ? { body: doc.toString(), removed: true }
    : { body: existingContent, removed: false };
}

function renderSourceDocument(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existingContent: string | undefined,
  relativePath: string,
): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".yaml" || extension === ".yml") {
    if (input.type !== "symbol") {
      throw new OperationError(
        "SOURCE_FORMAT_UNSUPPORTED",
        `YAML source authoring is supported only for symbol manifests, not ${input.type}`,
      );
    }
    return renderSymbolManifest(
      entity,
      input.relationships ?? [],
      existingContent,
    );
  }
  if (extension !== ".md" && extension !== ".mdx") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Unsupported authored source format: ${extension || "unknown"}`,
    );
  }
  return renderEntityDocument(input, entity, existingContent);
}

export async function writeSourceForUpsert(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing?: Readonly<Record<string, unknown>>,
  context?: OperationContext,
): Promise<{
  receipt: SourceWriteReceipt;
  rollback: () => Promise<void>;
} | null> {
  if (!context?.fs) return null;
  const absolute = sourcePath(context, input, entity, existing);
  const relative = path
    .relative(context.workspaceRoot, absolute)
    .replaceAll("\\", "/");
  let before: string | undefined;
  try {
    before = await context.fs.readFile(absolute);
  } catch {
    before = undefined;
  }
  const after = renderSourceDocument(input, entity, before, relative);
  await context.fs.mkdir(path.dirname(absolute));
  const temporary = `${absolute}.kibi-source-${digest(relative).slice(0, 12)}`;
  await context.fs.writeFile(temporary, after);
  if (context.fs.rename) {
    await context.fs.rename(temporary, absolute);
  } else {
    await context.fs.writeFile(absolute, after);
    await context.fs.unlink?.(temporary).catch(() => undefined);
  }
  const receipt: SourceWriteReceipt = {
    path: relative,
    mode: "write",
    beforeHash: before === undefined ? null : digest(before),
    afterHash: digest(after),
    created: before === undefined,
  };
  const pendingReceipt = pendingReceiptPath(context.workspaceRoot, relative);
  if (
    receipt.afterHash !== null &&
    (before === undefined || fs.existsSync(pendingReceipt))
  ) {
    writePendingSourceReceipt(
      context.workspaceRoot,
      relative,
      receipt.afterHash,
    );
  }
  return {
    receipt,
    rollback: async () => {
      if (before === undefined) {
        if (context.fs?.unlink) await context.fs.unlink(absolute);
        else await context.fs?.writeFile(absolute, "");
        try {
          fs.unlinkSync(pendingReceiptPath(context.workspaceRoot, relative));
        } catch {
          // The pending receipt is advisory recovery metadata.
        }
      } else {
        const rollbackTemp = `${absolute}.kibi-rollback-${digest(relative).slice(0, 12)}`;
        await context.fs?.writeFile(rollbackTemp, before);
        if (context.fs?.rename) await context.fs.rename(rollbackTemp, absolute);
        else {
          await context.fs?.writeFile(absolute, before);
          await context.fs?.unlink?.(rollbackTemp).catch(() => undefined);
        }
      }
    },
  };
}

/** Resolve and normalize the canonical authored path for an entity. */
export function canonicalSourcePath(
  context: OperationContext,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing?: Readonly<Record<string, unknown>>,
): string {
  return path
    .relative(
      context.workspaceRoot,
      sourcePath(context, input, entity, existing),
    )
    .replaceAll(path.sep, "/");
}
