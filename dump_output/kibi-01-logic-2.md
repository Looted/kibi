# Pack: kibi-01-logic (Part 2)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  cli/
    src/
      extractors/
        manifest.ts
        markdown.ts
        symbols-coordinator.ts
        symbols-ts.ts
      hooks/
        post-checkout.sh
        post-merge.sh
        pre-commit.sh
      schemas/
        changeset.schema.json
        entity.schema.json
        relationship.schema.json
      types/
        changeset.ts
        entities.ts
        js-yaml.d.ts
        relationships.ts
      kibi.code-workspace
      prolog.ts
    tests/
      fixtures/
        adr/
          ADR-001.md
        requirements/
          REQ-001.md
        scenarios/
          SCEN-001.md
      qa-extract.ts
    tsconfig.json
  core/
    schema/
      entities.pl
      relationships.pl
      validation.pl
    src/
      kb.pl
    tests/
      kb.plt
      schema.plt
    package.json
  mcp/
    bin/
      kibi-mcp
```

# Files

## File: packages/cli/src/extractors/manifest.ts
```typescript
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { load as parseYAML } from "js-yaml";

export interface ExtractedEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: unknown[];
  text_ref?: string;
}

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
}

export class ManifestError extends Error {
  constructor(
    message: string,
    public filePath: string,
  ) {
    super(message);
    this.name = "ManifestError";
  }
}

interface RelationshipObject {
  type?: string;
  target?: string;
}

interface ManifestSymbol {
  id?: string;
  title?: string;
  source?: string;
  status?: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: unknown[];
  relationships?: RelationshipObject[];
  text_ref?: string;
  created_at?: string;
  updated_at?: string;
}

interface ManifestFile {
  symbols?: ManifestSymbol[];
}

export function extractFromManifest(filePath: string): ExtractionResult[] {
  try {
    const content = readFileSync(filePath, "utf8");
    const manifest = parseYAML(content) as ManifestFile;

    if (!manifest.symbols || !Array.isArray(manifest.symbols)) {
      throw new ManifestError("No symbols array found in manifest", filePath);
    }

    return manifest.symbols.map((symbol) => {
      if (!symbol.title) {
        throw new ManifestError("Missing required field: title", filePath);
      }

      const id = symbol.id || generateId(filePath, symbol.title);
      const relationships = extractRelationships(
        symbol.relationships || symbol.links || [],
        id,
      );

      return {
        entity: {
          id,
          type: "symbol",
          title: symbol.title,
          status: symbol.status || "draft",
          created_at: symbol.created_at || new Date().toISOString(),
          updated_at: symbol.updated_at || new Date().toISOString(),
          source: filePath,
          tags: symbol.tags,
          owner: symbol.owner,
          priority: symbol.priority,
          severity: symbol.severity,
          links: symbol.links,
          text_ref: symbol.text_ref,
        },
        relationships,
      };
    });
  } catch (error) {
    if (error instanceof ManifestError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ManifestError(
        `Failed to parse manifest: ${error.message}`,
        filePath,
      );
    }

    throw error;
  }
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}

interface LinkObject {
  type?: string;
  target?: string;
  id?: string;
  to?: string;
}

function extractRelationships(
  links: unknown[],
  fromId: string,
): ExtractedRelationship[] {
  if (!Array.isArray(links)) return [];

  return links.map((link) => {
    if (typeof link === "string") {
      return {
        type: "relates_to",
        from: fromId,
        to: link,
      };
    }

    const linkObj = link as LinkObject;
    return {
      type: linkObj.type || "relates_to",
      from: fromId,
      to: linkObj.target || linkObj.id || linkObj.to || "",
    };
  });
}
```

## File: packages/cli/src/extractors/markdown.ts
```typescript
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import matter from "gray-matter";

export interface ExtractedEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: unknown[];
  text_ref?: string;
}

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
}

export class FrontmatterError extends Error {
  public classification: string;
  public hint: string;
  public originalError?: string;

  constructor(
    message: string,
    public filePath: string,
    options?: {
      classification?: string;
      hint?: string;
      originalError?: string;
    },
  ) {
    super(message);
    this.name = "FrontmatterError";
    this.classification = options?.classification || "Generic Error";
    this.hint = options?.hint || "Check the file for syntax errors.";
    this.originalError = options?.originalError;
  }

  override toString() {
    let msg = `${this.filePath}: [${this.classification}] ${this.message}`;
    if (this.hint) {
      msg += `\nHow to fix:\n- ${this.hint}`;
    }
    if (this.originalError) {
      msg += `\n\nOriginal error: ${this.originalError}`;
    }
    return msg;
  }
}

export function extractFromMarkdown(filePath: string): ExtractionResult {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new FrontmatterError(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      { classification: "File Read Error" },
    );
  }

  try {
    const { data, content: body } = matter(content);

    if (content.trim().startsWith("---")) {
      const parts = content.split("---");
      if (parts.length < 3) {
        throw new FrontmatterError("Missing closing --- delimiter", filePath, {
          classification: "Missing closing ---",
          hint: "Ensure the frontmatter is enclosed between two '---' delimiters.",
        });
      }
    }

    const type = data.type || inferTypeFromPath(filePath);

    if (!type) {
      throw new FrontmatterError(
        "Could not determine entity type from path or frontmatter",
        filePath,
        {
          classification: "Missing Type",
          hint: "Add 'type: <type>' to frontmatter or place file in a typed directory (e.g., /requirements/).",
        },
      );
    }

    if (!data.title) {
      throw new FrontmatterError("Missing required field: title", filePath, {
        classification: "Missing Field",
        hint: "Add a 'title: ...' field to the YAML frontmatter.",
      });
    }

    const id = data.id || generateId(filePath, data.title);
    const relationships = extractRelationships(data.links || [], id);

    return {
      entity: {
        id,
        type,
        title: data.title,
        status: data.status || "draft",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        source: filePath,
        tags: data.tags,
        owner: data.owner,
        priority: data.priority,
        severity: data.severity,
        links: data.links,
        text_ref: data.text_ref,
      },
      relationships,
    };
  } catch (error) {
    if (error instanceof FrontmatterError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message;
      let classification = "Frontmatter YAML syntax error";
      let hint = "Check the YAML syntax in your frontmatter.";

      if (
        message.includes("incomplete explicit mapping pair") &&
        message.includes(":")
      ) {
        classification = "Unquoted colon likely in title";
        hint =
          'Wrap values containing colons in quotes (e.g., title: "Foo: Bar").';
      } else if (
        !content.trim().startsWith("---") ||
        content.split("---").length < 3
      ) {
        if (
          content.trim().startsWith("---") &&
          content.split("---").length < 3
        ) {
          classification = "Missing closing ---";
          hint =
            "Ensure the frontmatter is enclosed between two '---' delimiters.";
        }
      } else if (
        message.includes("unexpected end of the stream") ||
        message.includes("flow collection") ||
        message.includes("end of the stream")
      ) {
        classification = "Generic YAML mapping error";
        hint = "Check for unclosed brackets, braces, or quotes in your YAML.";
      }

      throw new FrontmatterError(
        `Failed to parse frontmatter: ${message}`,
        filePath,
        {
          classification,
          hint,
          originalError: message,
        },
      );
    }

    throw error;
  }
}

export function inferTypeFromPath(filePath: string): string | null {
  if (filePath.includes("/requirements/")) return "req";
  if (filePath.includes("/scenarios/")) return "scenario";
  if (filePath.includes("/tests/")) return "test";
  if (filePath.includes("/adr/")) return "adr";
  if (filePath.includes("/flags/")) return "flag";
  if (filePath.includes("/events/")) return "event";
  if (filePath.includes("/facts/")) return "fact";
  return null;
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}

interface LinkObject {
  type?: string;
  target?: string;
  id?: string;
  to?: string;
}

function extractRelationships(
  links: unknown[],
  fromId: string,
): ExtractedRelationship[] {
  if (!Array.isArray(links)) return [];

  return links.map((link) => {
    if (typeof link === "string") {
      return {
        type: "relates_to",
        from: fromId,
        to: link,
      };
    }

    const linkObj = link as LinkObject;
    return {
      type: linkObj.type || "relates_to",
      from: fromId,
      to: linkObj.target || linkObj.id || linkObj.to || "",
    };
  });
}
```

## File: packages/cli/src/extractors/symbols-coordinator.ts
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinatesWithTsMorph,
} from "./symbols-ts.js";

const TS_JS_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

export type { ManifestSymbolEntry };

export async function enrichSymbolCoordinates(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  const output = entries.map((entry) => ({ ...entry }));

  const tsIndices: number[] = [];
  const tsEntries: ManifestSymbolEntry[] = [];

  for (let index = 0; index < output.length; index++) {
    const entry = output[index];
    const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
    if (!resolved) continue;

    const ext = path.extname(resolved.absolutePath).toLowerCase();
    if (TS_JS_EXTENSIONS.has(ext)) {
      tsIndices.push(index);
      tsEntries.push(entry);
      continue;
    }

    output[index] = enrichWithRegexHeuristic(entry, resolved.absolutePath);
  }

  if (tsEntries.length > 0) {
    const enrichedTs = await enrichSymbolCoordinatesWithTsMorph(
      tsEntries,
      workspaceRoot,
    );
    for (let i = 0; i < tsIndices.length; i++) {
      const target = tsIndices[i];
      const enriched = enrichedTs[i];
      if (target === undefined || !enriched) continue;
      output[target] = enriched;
    }
  }

  return output;
}

function enrichWithRegexHeuristic(
  entry: ManifestSymbolEntry,
  absolutePath: string,
): ManifestSymbolEntry {
  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    const escaped = escapeRegex(entry.title);
    const pattern = new RegExp(`\\b${escaped}\\b`);
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const match = pattern.exec(line);
      if (!match) continue;

      const sourceLine = i + 1;
      const sourceColumn = match.index;
      const sourceEndLine = sourceLine;
      const sourceEndColumn = sourceColumn + entry.title.length;

      return {
        ...entry,
        sourceLine,
        sourceColumn,
        sourceEndLine,
        sourceEndColumn,
        coordinatesGeneratedAt: new Date().toISOString(),
      };
    }

    return entry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[kibi] Failed regex coordinate heuristic for ${entry.id}: ${message}`,
    );
    return entry;
  }
}

function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): { absolutePath: string } | null {
  if (!sourceFile) return null;
  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!fs.existsSync(absolutePath)) return null;
  return { absolutePath };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

## File: packages/cli/src/extractors/symbols-ts.ts
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import {
  type ClassDeclaration,
  type Node,
  Project,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";

export interface SymbolCoordinates {
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
  coordinatesGeneratedAt: string;
}

export interface ManifestSymbolEntry {
  id: string;
  title: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  links?: string[];
  [key: string]: unknown;
}

const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFileCache = new Map<string, SourceFile>();

  const enriched: ManifestSymbolEntry[] = [];

  for (const entry of entries) {
    try {
      const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
      if (!resolved) {
        enriched.push(entry);
        continue;
      }

      const sourceFile = getOrAddSourceFile(project, sourceFileCache, resolved);
      if (!sourceFile) {
        enriched.push(entry);
        continue;
      }

      const match = findNamedDeclaration(sourceFile, entry.title);
      if (!match) {
        enriched.push(entry);
        continue;
      }

      const nameStart = match.getNameNode().getStart();
      const end = match.node.getEnd();

      const startLc = sourceFile.getLineAndColumnAtPos(nameStart);
      const endLc = sourceFile.getLineAndColumnAtPos(end);

      const coordinates: SymbolCoordinates = {
        sourceLine: startLc.line,
        sourceColumn: Math.max(0, startLc.column - 1),
        sourceEndLine: endLc.line,
        sourceEndColumn: Math.max(0, endLc.column - 1),
        coordinatesGeneratedAt: new Date().toISOString(),
      };

      enriched.push({
        ...entry,
        ...coordinates,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[kibi] Failed to enrich symbol coordinates for ${entry.id}: ${message}`,
      );
      enriched.push(entry);
    }
  }

  return enriched;
}

function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): string | null {
  if (!sourceFile) return null;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  const ext = path.extname(absolute).toLowerCase();

  if (!SUPPORTED_SOURCE_EXTENSIONS.has(ext)) return null;
  if (!fs.existsSync(absolute)) return null;

  return absolute;
}

function getOrAddSourceFile(
  project: Project,
  cache: Map<string, SourceFile>,
  absolutePath: string,
): SourceFile | null {
  const cached = cache.get(absolutePath);
  if (cached) return cached;

  try {
    const sourceFile = project.addSourceFileAtPath(absolutePath);
    cache.set(absolutePath, sourceFile);
    return sourceFile;
  } catch {
    return null;
  }
}

type NamedDeclarationCandidate = Node | ClassDeclaration | VariableDeclaration;

function findNamedDeclaration(
  sourceFile: SourceFile,
  title: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  const candidates: Array<{
    node: NamedDeclarationCandidate;
    getNameNode: () => Node;
  }> = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      if (declaration.getName() !== title) continue;
      const nameNode = declaration.getNameNode();
      candidates.push({ node: declaration, getNameNode: () => nameNode });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => a.getNameNode().getStart() - b.getNameNode().getStart(),
  );
  return candidates[0] ?? null;
}
```

## File: packages/cli/src/hooks/post-checkout.sh
```bash
#!/bin/sh
# post-checkout hook for kibi
# Parameters: old_ref new_ref branch_flag

old_ref=$1
new_ref=$2
branch_flag=$3

if [ "$branch_flag" = "1" ]; then
  kibi branch ensure && kibi sync
fi
```

## File: packages/cli/src/hooks/post-merge.sh
```bash
#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)

kibi sync
```

## File: packages/cli/src/hooks/pre-commit.sh
```bash
#!/bin/sh
# pre-commit hook for kibi
# Blocks commits if kibi check finds violations

set -e
kibi check
```

## File: packages/cli/src/schemas/changeset.schema.json
```json
{
  "$id": "changeset.schema.json",
  "title": "Changeset",
  "type": "object",
  "properties": {
    "operations": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "operation": { "const": "upsert" },
              "entity": { "$ref": "./entity.schema.json" },
              "relationships": {
                "type": "array",
                "items": { "$ref": "./relationship.schema.json" }
              }
            },
            "required": ["operation", "entity"],
            "additionalProperties": false
          },
          {
            "type": "object",
            "properties": {
              "operation": { "const": "delete" },
              "id": { "type": "string" }
            },
            "required": ["operation", "id"],
            "additionalProperties": false
          }
        ]
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "timestamp": { "type": "string" },
        "author": { "type": "string" },
        "source": { "type": "string" }
      },
      "required": ["timestamp"],
      "additionalProperties": false
    }
  },
  "required": ["operations"],
  "additionalProperties": false
}
```

## File: packages/cli/src/schemas/entity.schema.json
```json
{
  "$id": "entity.schema.json",
  "title": "Entity",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "draft",
        "archived",
        "deleted",
        "approved",
        "rejected",
        "pending",
        "in_progress",
        "superseded"
      ]
    },
    "created_at": { "type": "string" },
    "updated_at": { "type": "string" },
    "source": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "owner": { "type": "string" },
    "priority": { "type": "string" },
    "severity": { "type": "string" },
    "links": { "type": "array", "items": { "type": "string" } },
    "text_ref": { "type": "string" },
    "type": {
      "type": "string",
      "enum": [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact"
      ]
    }
  },
  "required": [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "source",
    "type"
  ],
  "additionalProperties": false
}
```

## File: packages/cli/src/schemas/relationship.schema.json
```json
{
  "$id": "relationship.schema.json",
  "title": "Relationship",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "depends_on",
        "specified_by",
        "verified_by",
        "validates",
        "implements",
        "covered_by",
        "constrained_by",
        "constrains",
        "requires_property",
        "guards",
        "publishes",
        "consumes",
        "supersedes",
        "relates_to"
      ]
    },
    "from": { "type": "string" },
    "to": { "type": "string" },
    "created_at": { "type": "string" },
    "created_by": { "type": "string" },
    "source": { "type": "string" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  },
  "required": ["type", "from", "to"],
  "additionalProperties": false
}
```

## File: packages/cli/src/types/changeset.ts
```typescript
import type { Entity } from "./entities";
import type BaseRelationship from "./relationships";

export interface UpsertOperation {
  operation: "upsert";
  entity: Entity;
  relationships?: BaseRelationship[];
}

export interface DeleteOperation {
  operation: "delete";
  id: string;
}

export type ChangesetOperation = UpsertOperation | DeleteOperation;

export interface Changeset {
  operations: ChangesetOperation[];
  metadata?: {
    timestamp: string;
    author?: string;
    source?: string;
  };
}

export default Changeset;
```

## File: packages/cli/src/types/entities.ts
```typescript
export interface BaseEntity {
  id: string;
  title: string;
  status: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  source: string; // URI
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: string[];
  text_ref?: string;
}

export type Requirement = BaseEntity & { type: "req" };
export type Scenario = BaseEntity & { type: "scenario" };
export type TestEntity = BaseEntity & { type: "test" };
export type ADR = BaseEntity & { type: "adr" };
export type Flag = BaseEntity & { type: "flag" };
export type Event = BaseEntity & { type: "event" };
export type Symbol = BaseEntity & { type: "symbol" };
export type Fact = BaseEntity & { type: "fact" };

export type Entity =
  | Requirement
  | Scenario
  | TestEntity
  | ADR
  | Flag
  | Event
  | Symbol
  | Fact;
```

## File: packages/cli/src/types/js-yaml.d.ts
```typescript
declare module "js-yaml" {
  export function load(input: string): unknown;
  export function dump(
    input: unknown,
    options?: Record<string, unknown>,
  ): string;
}
```

## File: packages/cli/src/types/relationships.ts
```typescript
export interface BaseRelationship {
  type:
    | "depends_on"
    | "specified_by"
    | "verified_by"
    | "implements"
    | "covered_by"
    | "constrained_by"
    | "constrains"
    | "requires_property"
    | "guards"
    | "publishes"
    | "consumes"
    | "supersedes"
    | "relates_to";
  from: string; // entity ID
  to: string; // entity ID
  created_at?: string;
  created_by?: string;
  source?: string;
  confidence?: number;
}

export default BaseRelationship;
```

## File: packages/cli/src/kibi.code-workspace
```
{
  "folders": [
    {
      "name": "kibi",
      "path": "../../.."
    }
  ]
}
```

## File: packages/cli/src/prolog.ts
```typescript
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

export interface PrologOptions {
  swiplPath?: string;
  timeout?: number;
}

export interface QueryResult {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
}

export class PrologProcess {
  private process: ChildProcess | null = null;
  private swiplPath: string;
  private timeout: number;
  private outputBuffer = "";
  private errorBuffer = "";
  private cache: Map<string, QueryResult> = new Map();
  private useOneShotMode =
    typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
  private attachedKbPath: string | null = null;

  constructor(options: PrologOptions = {}) {
    this.swiplPath = options.swiplPath || "swipl";
    this.timeout = options.timeout || 30000;
  }

  async start(): Promise<void> {
    if (!existsSync(this.swiplPath) && this.swiplPath !== "swipl") {
      throw new Error(
        `SWI-Prolog not found at ${this.swiplPath}. Please install SWI-Prolog or check your PATH.`,
      );
    }

    const kbPath = path.resolve(importMetaDir, "../../core/src/kb.pl");

    this.process = spawn(this.swiplPath, [
      "-g",
      `use_module('${kbPath}'), set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])`,
      "--quiet",
    ]);

    if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
      throw new Error("Failed to spawn Prolog process");
    }

    this.process.stdout.on("data", (chunk) => {
      this.outputBuffer += chunk.toString();
    });

    this.process.stderr.on("data", (chunk) => {
      this.errorBuffer += chunk.toString();
    });

    process.on("exit", () => {
      this.terminate();
    });

    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (this.errorBuffer.includes("ERROR")) {
      throw new Error(
        `Failed to load kb module: ${this.translateError(this.errorBuffer)}`,
      );
    }

    this.outputBuffer = "";
    this.errorBuffer = "";
  }

  async query(goal: string | string[]): Promise<QueryResult> {
    const isSingleGoal = typeof goal === "string";
    const goalKey = isSingleGoal ? goal : null;
    const cacheable = goalKey !== null && this.isCacheableGoal(goalKey);

    if (cacheable) {
      const cachedResult = this.cache.get(goalKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    if (this.useOneShotMode) {
      const oneShotResult = await this.queryOneShot(goal);
      if (!cacheable && oneShotResult.success) {
        this.invalidateCache();
      }
      if (cacheable && oneShotResult.success) {
        this.cache.set(goalKey, oneShotResult);
      }
      return oneShotResult;
    }

    if (!isSingleGoal) {
      const batchGoal = `(${goal.map((item) => this.normalizeGoal(item)).join(", ")})`;
      return this.query(batchGoal);
    }

    if (!this.process || !this.process.stdin) {
      throw new Error("Prolog process not started");
    }

    this.outputBuffer = "";
    this.errorBuffer = "";

    this.process.stdin.write(`${goal}.
`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Query timeout after 30s"));
      }, this.timeout);

      const checkResult = () => {
        if (this.errorBuffer.length > 0 && this.errorBuffer.includes("ERROR")) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            bindings: {},
            error: this.translateError(this.errorBuffer),
          });
        } else if (
          this.outputBuffer.includes("true.") ||
          this.outputBuffer.match(/^[A-Z_][A-Za-z0-9_]*\s*=\s*.+\./m)
        ) {
          clearTimeout(timeoutId);
          const result = {
            success: true,
            bindings: this.extractBindings(this.outputBuffer),
          };
          if (cacheable) {
            this.cache.set(goalKey, result);
          }
          resolve(result);
        } else if (
          this.outputBuffer.includes("false.") ||
          this.outputBuffer.includes("fail.")
        ) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            bindings: {},
            error: "Query failed",
          });
        } else {
          setTimeout(checkResult, 50);
        }
      };

      checkResult();
    });
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  private isCacheableGoal(goal: string): boolean {
    const trimmed = goal.trim();
    return !(
      trimmed.startsWith("kb_attach(") ||
      trimmed.startsWith("kb_detach") ||
      trimmed.startsWith("kb_save") ||
      trimmed.startsWith("kb_assert_") ||
      trimmed.startsWith("kb_delete_") ||
      trimmed.startsWith("kb_retract_")
    );
  }

  private async queryOneShot(goal: string | string[]): Promise<QueryResult> {
    if (Array.isArray(goal)) {
      return this.execOneShot(goal, this.attachedKbPath);
    }

    const trimmedGoal = this.normalizeGoal(goal);

    // Keep a lightweight compatibility layer for callers that rely on
    // stateful attach/detach across multiple query() calls.
    if (trimmedGoal.startsWith("kb_detach")) {
      this.attachedKbPath = null;
      return { success: true, bindings: {} };
    }

    const attachMatch = trimmedGoal.match(/^kb_attach\('(.+)'\)$/);
    if (attachMatch) {
      const attachResult = this.execOneShot(trimmedGoal, null);
      if (attachResult.success) {
        this.attachedKbPath = attachMatch[1];
      }
      return attachResult;
    }

    return this.execOneShot(trimmedGoal, this.attachedKbPath);
  }

  private execOneShot(goal: string, kbPath: string | null): QueryResult;
  private execOneShot(goal: string[], kbPath: string | null): QueryResult;
  private execOneShot(
    goal: string | string[],
    kbPath: string | null,
  ): QueryResult {
    const goalList = Array.isArray(goal)
      ? goal.map((item) => this.normalizeGoal(item))
      : [this.normalizeGoal(goal)];
    const isBatch = goalList.length > 1;
    const combinedGoal =
      goalList.length === 1 ? goalList[0] : `(${goalList.join(", ")})`;
    const kbModulePath = path.resolve(importMetaDir, "../../core/src/kb.pl");
    const prologGoal = [
      `use_module('${kbModulePath}')`,
      "use_module(library(semweb/rdf_db))",
      "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])",
      "getenv('KIBI_GOAL', GoalAtom)",
      "read_term_from_atom(GoalAtom, Goal, [variable_names(Vars)])",
      kbPath ? "getenv('KIBI_KB_PATH', KBPath), kb_attach(KBPath)" : "true",
      isBatch ? "WrappedGoal = rdf_transaction(Goal)" : "WrappedGoal = Goal",
      "(catch(call(WrappedGoal), E, (print_message(error, E), fail)) -> (forall(member(Name=Value, Vars), (write(Name), write('='), write_term(Value, [quoted(true), max_depth(0)]), writeln('.'))), writeln('__KIBI_TRUE__.')) ; writeln('__KIBI_FALSE__.'))",
      kbPath ? "kb_save, kb_detach" : "true",
    ].join(", ");

    const result = spawnSync(
      this.swiplPath,
      ["-q", "-g", prologGoal, "-t", "halt"],
      {
        encoding: "utf8",
        timeout: this.timeout,
        env: {
          ...process.env,
          KIBI_GOAL: combinedGoal,
          ...(kbPath ? { KIBI_KB_PATH: kbPath } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (
      result.error &&
      (result.error.message.includes("timed out") ||
        // Bun/Node differ here; keep a conservative timeout detection.
        result.error.message.includes("ETIMEDOUT"))
    ) {
      throw new Error("Query timeout after 30s");
    }

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

    if (stdout.includes("__KIBI_TRUE__")) {
      const clean = stdout
        .split("\n")
        .filter((line) => !line.includes("__KIBI_TRUE__"))
        .join("\n");
      return {
        success: true,
        bindings: this.extractBindings(clean),
      };
    }

    if (stderr.includes("ERROR")) {
      return {
        success: false,
        bindings: {},
        error: this.translateError(stderr),
      };
    }

    return {
      success: false,
      bindings: {},
      error: "Query failed",
    };
  }

  private normalizeGoal(goal: string): string {
    return goal.trim().replace(/\.+\s*$/, "");
  }

  private extractBindings(output: string): Record<string, string> {
    const bindings: Record<string, string> = {};
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Za-z0-9_]*)\s*=\s*(.+)\.?\s*$/);
      if (match) {
        const [, varName, value] = match;
        bindings[varName] = value.trim().replace(/\.$/, "").replace(/,$/, "");
      }
    }

    return bindings;
  }

  private translateError(errorText: string): string {
    if (
      errorText.includes("existence_error") ||
      errorText.includes("Unknown procedure")
    ) {
      return "Predicate or file not found";
    }
    if (errorText.includes("permission_error")) {
      return "Access denied or KB locked";
    }
    if (
      errorText.includes("syntax_error") ||
      errorText.includes("Operator expected")
    ) {
      return "Invalid query syntax";
    }
    if (errorText.includes("timeout_error")) {
      return "Operation exceeded 30s timeout";
    }

    const simpleError = errorText
      .replace(/ERROR:\s*/g, "")
      .replace(/^\*\*.*\*\*$/gm, "")
      .replace(/^\s+/gm, "")
      .split("\n")[0]
      .trim();

    return simpleError || "Unknown error";
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getPid(): number {
    return this.process?.pid || 0;
  }

  async terminate(): Promise<void> {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill("SIGTERM");

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve(undefined);
        }, 1000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });

      this.process = null;
    }
  }
}
```

## File: packages/cli/tests/fixtures/adr/ADR-001.md
```markdown
---
title: ADR-001 - Use PostgreSQL for Primary Database
status: accepted
created_at: 2024-01-10T11:00:00Z
updated_at: 2024-01-10T11:00:00Z
type: adr
tags:
  - architecture
  - database
---

# ADR-001: Use PostgreSQL for Primary Database

## Status
Accepted

## Context
We need to choose a database for storing user data, authentication tokens, and application state.

## Decision
Use PostgreSQL as the primary database.

## Consequences
- Strong ACID guarantees
- JSON support for flexible schemas
- Wide ecosystem support
- Additional operational complexity vs SQLite
```

## File: packages/cli/tests/fixtures/requirements/REQ-001.md
```markdown
---
title: User Authentication
status: approved
created_at: 2024-01-15T10:30:00Z
updated_at: 2024-01-20T14:45:00Z
priority: high
owner: security-team
tags:
  - authentication
  - security
  - phase-1
---

# User Authentication

The system shall provide secure user authentication using OAuth 2.0.

## Acceptance Criteria

- Users can log in with username/password
- Session tokens expire after 24 hours
- Failed login attempts are rate-limited
```

## File: packages/cli/tests/fixtures/scenarios/SCEN-001.md
```markdown
---
title: Login Flow Test
status: active
created_at: 2024-01-16T09:00:00Z
updated_at: 2024-01-16T09:00:00Z
type: scenario
tags:
  - authentication
  - e2e
links:
  - type: specified_by
    target: REQ-001
  - type: relates_to
    target: SCEN-002
---

# Login Flow Test Scenario

## Given
- User exists in the database
- User has valid credentials

## When
- User navigates to /login
- User enters username and password
- User clicks "Login" button

## Then
- User is redirected to dashboard
- Session cookie is set
- User profile is displayed
```

## File: packages/cli/tests/qa-extract.ts
```typescript
#!/usr/bin/env bun
import { extractFromMarkdown } from "../src/extractors/markdown.js";

const filePath = process.argv[2];

if (!filePath || filePath === "-") {
  console.error("Usage: bun qa-extract.ts <markdown-file>");
  process.exit(1);
}

try {
  const result = extractFromMarkdown(filePath);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
```

## File: packages/cli/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

## File: packages/core/schema/entities.pl
```perl
% Module: kibi_entities
% Entity type and property definitions for Kibi knowledge base
:- module(kibi_entities, [entity_type/1, entity_property/3, required_property/2, optional_property/2]).

% Entity types
entity_type(req).
entity_type(scenario).
entity_type(test).
entity_type(adr).
entity_type(flag).
entity_type(event).
entity_type(symbol).
entity_type(fact).

% entity_property(EntityType, Property, Type).
% Basic typing hints (atom, string, datetime, list, uri)
entity_property(_, id, atom).
entity_property(_, title, string).
entity_property(_, status, atom).
entity_property(_, created_at, datetime).
entity_property(_, updated_at, datetime).
entity_property(_, source, uri).

% Optional properties
entity_property(_, tags, list).
entity_property(_, owner, atom).
entity_property(_, priority, atom).
entity_property(_, severity, atom).
entity_property(_, links, list).
entity_property(_, text_ref, uri).

% Required properties for all entity types
required_property(Type, id) :- entity_type(Type).
required_property(Type, title) :- entity_type(Type).
required_property(Type, status) :- entity_type(Type).
required_property(Type, created_at) :- entity_type(Type).
required_property(Type, updated_at) :- entity_type(Type).
required_property(Type, source) :- entity_type(Type).

% Optional properties for all entity types
optional_property(Type, tags) :- entity_type(Type).
optional_property(Type, owner) :- entity_type(Type).
optional_property(Type, priority) :- entity_type(Type).
optional_property(Type, severity) :- entity_type(Type).
optional_property(Type, links) :- entity_type(Type).
optional_property(Type, text_ref) :- entity_type(Type).

% Documentation helpers
% list all entity types
all_entity_types(Ts) :- findall(T, entity_type(T), Ts).
```

## File: packages/core/schema/relationships.pl
```perl
% Module: kibi_relationships
% Relationship type definitions and valid entity combinations
:- module(kibi_relationships, [relationship_type/1, valid_relationship/3, relationship_metadata/1]).

% Relationship types
relationship_type(depends_on).
relationship_type(specified_by).
relationship_type(verified_by).
relationship_type(validates).
relationship_type(implements).
relationship_type(covered_by).
relationship_type(constrained_by).
relationship_type(guards).
relationship_type(publishes).
relationship_type(consumes).
relationship_type(relates_to).
relationship_type(supersedes).
relationship_type(constrains).
relationship_type(requires_property).

% valid_relationship(RelType, FromType, ToType).
valid_relationship(depends_on, req, req).
valid_relationship(specified_by, req, scenario).
valid_relationship(verified_by, req, test).
valid_relationship(validates, test, req).
valid_relationship(implements, symbol, req).
valid_relationship(covered_by, symbol, test).
valid_relationship(constrained_by, symbol, adr).
% guards can target symbol, event, or req
valid_relationship(guards, flag, symbol).
valid_relationship(guards, flag, event).
valid_relationship(guards, flag, req).
valid_relationship(publishes, symbol, event).
valid_relationship(consumes, symbol, event).
valid_relationship(constrains, req, fact).
valid_relationship(requires_property, req, fact).

%% supersedes(+NewAdrId, +OldAdrId)
%% NewAdrId is the decision that replaces OldAdrId.
%% OldAdrId's status should be archived or deprecated as a consequence.
valid_relationship(supersedes, adr, adr).
valid_relationship(supersedes, req, req).
% escape hatch - allow any to any
valid_relationship(relates_to, _, _).

% Relationship metadata fields (some optional)
relationship_metadata([created_at, created_by, source, confidence]).
```

## File: packages/core/schema/validation.pl
```perl
% Module: kibi_validation
% Validation rules for entities and relationships in Kibi
:- module(kibi_validation,
          [ validate_entity/2,        % +Type, +Props
            validate_relationship/3,  % +RelType, +FromEntity, +ToEntity
            validate_property_type/3  % +Type, +Prop, +Value
          ]).

:- use_module('entities.pl').
:- use_module('relationships.pl').

% validate_entity(+Type, +Props:list)
% Props is a list of Property=Value pairs (e.g. id=ID, title=Title)
validate_entity(Type, Props) :-
    % check entity type exists
    entity_type(Type),
    % required properties present
    forall(required_property(Type, P), memberchk(P=_Val, Props)),
    % all properties have correct types
    forall(member(Key=Val, Props), validate_property_type(Type, Key, Val)).

% validate_relationship(+RelType, +From, +To)
% From and To are pairs Type=Id or structures type(Type) - allow Type or Type=Id
validate_relationship(RelType, From, To) :-
    relationship_type(RelType),
    % extract types
    type_of(From, FromType),
    type_of(To, ToType),
    % valid combination
    valid_relationship(RelType, FromType, ToType).

type_of(Type, Type) :- atom(Type), entity_type(Type), !.
type_of(Type=_Id, Type) :- atom(Type), entity_type(Type), !.

% validate_property_type(+EntityType, +Prop, +Value)
validate_property_type(_Type, Prop, Value) :-
    % find declared property type, default to atom
    ( entity_property(_Any, Prop, Kind) -> true ; Kind = atom ),
    check_kind(Kind, Value), !.

% check_kind(Kind, Value) succeeds if Value matches Kind
check_kind(atom, V) :- atom(V).
check_kind(string, V) :- string(V).
check_kind(datetime, V) :- string(V). % accept ISO strings for now
check_kind(list, V) :- is_list(V).
check_kind(uri, V) :- string(V).

% Fallback false
check_kind(_, _) :- fail.
```

## File: packages/core/src/kb.pl
```perl
% Module: kb
% Core Knowledge Base module with RDF persistence and audit logging
:- module(kb, [
    kb_attach/1,
    kb_detach/0,
    kb_save/0,
    with_kb_mutex/1,
    kb_assert_entity/2,
    kb_retract_entity/1,
    kb_entity/3,
    kb_entities_by_source/2,
    kb_assert_relationship/4,
    kb_relationship/3,
    transitively_implements/2,
    transitively_depends/2,
    impacted_by_change/2,
    affected_symbols/2,
    coverage_gap/2,
    untested_symbols/1,
    stale/2,
    orphaned/1,
    conflicting/2,
    deprecated_still_used/2,
    current_adr/1,
    superseded_by/2,
    adr_chain/2,
    deprecated_no_successor/1,
    current_req/1,
    contradicting_reqs/3,
    normalize_term_atom/2,
    changeset/4, % Export for testing
    kb_uri/1
]).

:- use_module(library(semweb/rdf11)).
:- use_module(library(persistency)).
:- use_module(library(thread)).
:- use_module(library(filesex)).
:- use_module(library(ordsets)).
:- use_module('../schema/entities.pl', [entity_type/1, entity_property/3, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1, valid_relationship/3]).
:- use_module('../schema/validation.pl', [validate_entity/2, validate_relationship/3]).

% Constants
kb_uri('urn-kibi:').

% RDF namespace for KB entities and relationships
:- kb_uri(URI), rdf_register_prefix(kb, URI).
:- rdf_register_prefix(xsd, 'http://www.w3.org/2001/XMLSchema#').
:- rdf_meta
    kb_entity(?, ?, ?),
    kb_relationship(?, ?, ?).

% Persistent audit log declaration
:- persistent
    changeset(timestamp:atom, operation:atom, entity_id:atom, data:any).

% Dynamic facts to track KB state
:- dynamic kb_attached/1.
:- dynamic kb_audit_db/1.
:- dynamic kb_graph/1.

%% kb_attach(+Directory)
% Attach to a KB directory with RDF persistence and file locking.
% Creates directory if it doesn't exist.
kb_attach(Directory) :-
    % If we were already attached in this process, detach first.
    % This prevents accidentally loading the same RDF snapshot multiple times.
    (   kb_attached(_)
    ->  kb_detach
    ;   true
    ),
    % Ensure directory exists
    (   exists_directory(Directory)
    ->  true
    ;   make_directory_path(Directory)
    ),
    % Create RDF graph name from directory
    atom_concat('file://', Directory, GraphURI),
    % If a graph with this URI is already present, unload it to avoid duplicates.
    (   rdf_graph(GraphURI)
    ->  rdf_unload_graph(GraphURI)
    ;   true
    ),
    % Load existing RDF data if present
    atom_concat(Directory, '/kb.rdf', DataFile),
    (   exists_file(DataFile)
    ->  rdf_load(DataFile, [graph(GraphURI), silent(true)])
    ;   true
    ),
    % Set up audit log - only attach if not already attached
    atom_concat(Directory, '/audit.log', AuditLog),
    (   db_attached(AuditLog)
    ->  true  % Already attached
    ;   db_attach(AuditLog, [])
    ),
    % Track attachment state
    assert(kb_attached(Directory)),
    assert(kb_audit_db(AuditLog)),
    assert(kb_graph(GraphURI)).

%% kb_detach
% Safely detach from KB, flushing journals and closing audit log.
kb_detach :-
    (   kb_attached(_Directory)
    ->  (
            kb_save,
            % Clear state
            retractall(kb_attached(_)),
            retractall(kb_audit_db(_)),
            retractall(kb_graph(_))
        )
    ;   true
    ).

%% kb_save
% Save RDF graph and sync audit log to disk
kb_save :-
    (   kb_attached(Directory)
    ->  (
            % Save RDF graph to file with namespace declarations
            atom_concat(Directory, '/kb.rdf', DataFile),
            % Get current graph URI
            kb_graph(GraphURI),
            % If we have a graph URI, save that graph. Otherwise save all data
            % (fallback) so a kb.rdf is always produced. Report errors if save fails.
            (   kb_graph(GraphURI)
            ->  catch(rdf_save(DataFile, [graph(GraphURI), base_uri('urn-kibi:'), namespaces([kb, xsd])]), E, print_message(error, E))
            ;   catch(rdf_save(DataFile, [base_uri('urn-kibi:'), namespaces([kb, xsd])]), E2, print_message(error, E2))
            ),
            % Sync audit log
            (   kb_audit_db(AuditLog)
            ->  db_sync(AuditLog)
            ;   true
            )
        )
    ;   true
    ).

%% with_kb_mutex(+Goal)
% Execute Goal with KB mutex protection for thread safety.
with_kb_mutex(Goal) :-
    with_mutex(kb_lock, Goal).

%% kb_assert_entity(+Type, +Properties)
% Assert an entity into the KB with validation and audit logging.
% Properties is a list of Key=Value pairs.
kb_assert_entity(Type, Props) :-
    % Validate entity
    validate_entity(Type, Props),
    % Extract ID
    memberchk(id=Id, Props),
    % Get current graph
    kb_graph(Graph),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URI using prefix notation for namespace expansion
        format(atom(EntityURI), 'kb:entity/~w', [Id]),
        % Upsert semantics: remove any existing triples for this entity first.
        rdf_retractall(EntityURI, _, _, Graph),
        % Store type as string literal to prevent URI interpretation
        atom_string(Type, TypeStr),
        rdf_assert(EntityURI, kb:type, TypeStr^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        % Store all properties
        forall(
            member(Key=Value, Props),
            store_property(EntityURI, Key, Value, Graph)
        ),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, upsert, Id, Type-Props)
    )).

%% kb_retract_entity(+Id)
% Remove an entity from the KB with audit logging.
kb_retract_entity(Id) :-
    kb_graph(Graph),
    with_kb_mutex((
        % Create entity URI
        atom_concat('kb:entity/', Id, EntityURI),
        % Remove all triples for this entity
        rdf_retractall(EntityURI, _, _, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, delete, Id, null)
    )).

%% kb_entity(?Id, ?Type, ?Properties)
% Query entities from the KB.
% Properties is unified with a list of Key=Value pairs.
kb_entity(Id, Type, Props) :-
    kb_graph(Graph),
    % Find entity by pattern - use unquoted namespace term kb:type
    (   var(Id)
    ->  rdf(EntityURI, kb:type, TypeLiteral, Graph),
        atom_concat('kb:entity/', Id, EntityURI)
    ;   atom_concat('kb:entity/', Id, EntityURI),
        rdf(EntityURI, kb:type, TypeLiteral, Graph)
    ),
    % Extract type - convert string literal to atom
    literal_to_atom(TypeLiteral, Type),
    % Collect all properties (exclude kb:type which expands to full URI)
    findall(Key=Value, (
        rdf(EntityURI, PropURI, ValueLiteral, Graph),
        kb_uri(BaseURI),
        atom_concat(BaseURI, type, TypeURI),
        PropURI \= TypeURI,
        uri_to_key(PropURI, Key),
        literal_to_value(ValueLiteral, Value)
    ), Props).

%% kb_entities_by_source(+SourcePath, -Ids)
% Returns all entity IDs whose source property matches SourcePath (substring match).
kb_entities_by_source(SourcePath, Ids) :-
    findall(Id,
        (kb_entity(Id, _Type, Props),
         memberchk(source-S, Props),
         sub_atom(S, _, _, _, SourcePath)),
        Ids).

%% kb_assert_relationship(+Type, +From, +To, +Metadata)
% Assert a relationship between two entities with validation.
kb_assert_relationship(RelType, FromId, ToId, _Metadata) :-
    kb_graph(Graph),
    % Validate entities exist and relationship is valid
    % Use once/1 to keep this predicate deterministic even if the store
    % contains duplicate type triples from previous versions.
    once(kb_entity(FromId, FromType, _)),
    once(kb_entity(ToId, ToType, _)),
    validate_relationship(RelType, FromType, ToType),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URIs
        atom_concat('kb:entity/', FromId, FromURI),
        atom_concat('kb:entity/', ToId, ToURI),
        % Create relationship property URI (full URI to match saved/loaded RDF)
        kb_uri(BaseURI),
        atom_concat(BaseURI, RelType, RelURI),
        % Upsert semantics: ensure the exact triple isn't duplicated.
        rdf_retractall(FromURI, RelURI, ToURI, Graph),
        % Assert relationship triple
        rdf_assert(FromURI, RelURI, ToURI, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        format(atom(RelId), '~w->~w', [FromId, ToId]),
        assert_changeset(TS, upsert_rel, RelId, RelType-[from=FromId, to=ToId])
    )).

%% kb_relationship(?Type, ?From, ?To)
% Query relationships from the KB.
kb_relationship(RelType, FromId, ToId) :-
    kb_graph(Graph),
    % Create relationship property URI (full URI to match loaded RDF)
    kb_uri(BaseURI),
    atom_concat(BaseURI, RelType, RelURI),
    % Find matching relationships
    rdf(FromURI, RelURI, ToURI, Graph),
    % Extract IDs from URIs
    atom_concat('kb:entity/', FromId, FromURI),
    atom_concat('kb:entity/', ToId, ToURI).

% Helper predicates

%% store_property(+EntityURI, +Key, +Value, +Graph)
% Store a property as an RDF triple with appropriate datatype.
% All values are stored as typed string literals to avoid URI interpretation issues.
% Uses prefix notation (kb:Key) to enable proper namespace expansion.
store_property(EntityURI, Key, Value, Graph) :-
    % Build property URI using prefix notation for namespace expansion
    format(atom(PropURI), 'kb:~w', [Key]),
    % Always convert to literal (never store as URI/resource)
    value_to_literal(Value, Literal),
    rdf_assert(EntityURI, PropURI, Literal, Graph).

%% value_to_literal(+Value, -Literal)
% Convert Prolog value to RDF literal with appropriate datatype.
value_to_literal(Value, Literal) :-
    (   string(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#string'
    ;   is_list(Value)
    ->  format(atom(ListStr), '~w', [Value]),
        Literal = ListStr^^'http://www.w3.org/2001/XMLSchema#string'
    ;   format(atom(Str), '~w', [Value]),
        Literal = Str^^'http://www.w3.org/2001/XMLSchema#string'
    ).

%% literal_to_value(+Literal, -Value)
% Extract value from RDF literal, parse list syntax back to Prolog lists.
literal_to_value(Literal, Value) :-
    (   % Handle ^^/2 functor (RDF typed literal shorthand)
        Literal = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
    ->  (   % Preserve RDF typed literal functor for string values so callers
            % can inspect datatype if needed; but also attempt to parse lists
            % encoded as string into Prolog lists when appropriate.
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
        )
    ;   Literal = ^^(Val, Type)
    ->  Value = ^^(Val, Type)  % Preserve other typed literals as their functor
    ;   Literal = literal(type('http://www.w3.org/2001/XMLSchema#string', StrVal))
    ->  (   % Try to parse as Prolog list term (handles both atoms and strings)
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = StrVal
        )
    ;   Literal = literal(type(_, _))
    ->  Value = Literal  % Keep other typed literals as-is
    ;   Literal = literal(lang(_, Val))
    ->  Value = Val
    ;   Literal = literal(Value)
    ->  true
    ;   Value = Literal
    ).

%% literal_to_atom(+Literal, -Atom)
% Convert RDF literal to atom (for type field).
literal_to_atom(Literal, Atom) :-
    (   % Handle RDF typed literal shorthand functor ^^(Value, Type)
        Literal = ^^(Val, _Type)
    ->  (   % Val may be atom or string
            atom(Val)
        ->  Atom = Val
        ;   atom_string(Atom, Val)
        )
    ;   Literal = literal(type(_, StringVal))
    ->  atom_string(Atom, StringVal)
    ;   Literal = literal(Value)
    ->  (atom(Value) -> Atom = Value ; atom_string(Atom, Value))
    ;   atom(Literal)
    ->  Atom = Literal
    ;   atom_string(Atom, Literal)
    ).

%% uri_to_key(+URI, -Key)
% Convert URI to property key (strip kb: namespace prefix).
uri_to_key(URI, Key) :-
    (   kb_uri(BaseURI),
        atom_concat(BaseURI, Key, URI)
    ->  true
    ;   atom_concat('kb:', Key, URI)
    ->  true
    ;   URI = Key
    ).

%% ------------------------------------------------------------------
%% Inference predicates (Phase 1)
%% ------------------------------------------------------------------

%% transitively_implements(+Symbol, +Req)
% A symbol transitively implements a requirement if it directly implements it,
% or if it is covered by a test that validates/verifies the requirement.
transitively_implements(Symbol, Req) :-
    kb_relationship(implements, Symbol, Req).
transitively_implements(Symbol, Req) :-
    kb_relationship(covered_by, Symbol, Test),
    kb_relationship(validates, Test, Req).
transitively_implements(Symbol, Req) :-
    kb_relationship(covered_by, Symbol, Test),
    kb_relationship(verified_by, Req, Test).

%% transitively_depends(+Req1, +Req2)
% Req1 transitively depends on Req2 through depends_on chains.
transitively_depends(Req1, Req2) :-
    transitively_depends_(Req1, Req2, []).

transitively_depends_(Req1, Req2, _) :-
    kb_relationship(depends_on, Req1, Req2).
transitively_depends_(Req1, Req2, Visited) :-
    kb_relationship(depends_on, Req1, Mid),
    Req1 \= Mid,
    \+ memberchk(Mid, Visited),
    transitively_depends_(Mid, Req2, [Req1|Visited]).

%% impacted_by_change(?Entity, +Changed)
% Entity is impacted if it is connected to Changed by any relationship
% direction via bounded, cycle-safe traversal.
impacted_by_change(Changed, Changed).
impacted_by_change(Entity, Changed) :-
    dif(Entity, Changed),
    connected_entity(Changed, Entity, [Changed]).

connected_entity(Current, Target, _Visited) :-
    linked_entity(Current, Target).
connected_entity(Current, Target, Visited) :-
    linked_entity(Current, Next),
    \+ memberchk(Next, Visited),
    connected_entity(Next, Target, [Next|Visited]).

linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, A, B).
linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, B, A).

%% affected_symbols(+Req, -Symbols)
% Symbols affected by a requirement change include symbols implementing Req,
% and symbols implementing requirements that depend on Req.
affected_symbols(Req, Symbols) :-
    setof(Symbol,
          RelatedReq^(requirement_in_scope(RelatedReq, Req),
                     transitively_implements(Symbol, RelatedReq)),
          Symbols),
    !.
affected_symbols(_, []).

requirement_in_scope(Req, Req).
requirement_in_scope(RelatedReq, Req) :-
    transitively_depends(RelatedReq, Req).

%% coverage_gap(+Req, -Reason)
% Detects missing scenario/test coverage for MUST requirements.
coverage_gap(Req, missing_scenario_and_test) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    \+ has_test(Req).
coverage_gap(Req, missing_scenario) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    has_test(Req).
coverage_gap(Req, missing_test) :-
    must_requirement(Req),
    has_scenario(Req),
    \+ has_test(Req).

must_requirement(Req) :-
    kb_entity(Req, req, Props),
    memberchk(priority=Priority, Props),
    normalize_term_atom(Priority, PriorityAtom),
    atom_string(PriorityAtom, PriorityStr),
    sub_string(PriorityStr, _, 4, 0, "must").

has_scenario(Req) :-
    once(kb_relationship(specified_by, Req, _)).

has_test(Req) :-
    once(kb_relationship(validates, _, Req)).
has_test(Req) :-
    once(kb_relationship(verified_by, Req, _)).

%% untested_symbols(-Symbols)
% Returns symbols with no test coverage relationship.
untested_symbols(Symbols) :-
    setof(Symbol,
          (kb_entity(Symbol, symbol, _),
           \+ kb_relationship(covered_by, Symbol, _)),
          Symbols),
    !.
untested_symbols([]).

%% stale(+Entity, +MaxAgeDays)
% Entity is stale if updated_at is older than MaxAgeDays.
stale(Entity, MaxAgeDays) :-
    number(MaxAgeDays),
    MaxAgeDays >= 0,
    kb_entity(Entity, _, Props),
    memberchk(updated_at=UpdatedAt, Props),
    coerce_timestamp_atom(UpdatedAt, UpdatedAtAtom),
    parse_time(UpdatedAtAtom, iso_8601, UpdatedTs),
    get_time(NowTs),
    AgeDays is (NowTs - UpdatedTs) / 86400,
    AgeDays > MaxAgeDays.

%% orphaned(+Symbol)
% Symbol is orphaned if it has no core traceability links.
orphaned(Symbol) :-
    kb_entity(Symbol, symbol, _),
    \+ kb_relationship(implements, Symbol, _),
    \+ kb_relationship(covered_by, Symbol, _),
    \+ kb_relationship(constrained_by, Symbol, _).

%% conflicting(?Adr1, ?Adr2)
% ADRs conflict if they both constrain the same symbol and are distinct.
conflicting(Adr1, Adr2) :-
    kb_relationship(constrained_by, Symbol, Adr1),
    kb_relationship(constrained_by, Symbol, Adr2),
    Adr1 \= Adr2,
    Adr1 @< Adr2.

%% deprecated_still_used(+Adr, -Symbols)
% Deprecated/archived/rejected ADRs that still constrain symbols.
deprecated_still_used(Adr, Symbols) :-
    kb_entity(Adr, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [deprecated, archived, rejected]),
    setof(Symbol, kb_relationship(constrained_by, Symbol, Adr), Symbols),
    !.
deprecated_still_used(_, []).

%% ------------------------------------------------------------------
%% ADR Supersession Predicates
%% ------------------------------------------------------------------

%% current_adr(+Id)
% True when Id is an ADR not superseded by any other ADR.
current_adr(Id) :-
    kb_entity(Id, adr, _),
    \+ kb_relationship(supersedes, _, Id).

%% superseded_by(+OldId, -NewId)
% Direct supersession.
superseded_by(OldId, NewId) :-
    kb_relationship(supersedes, NewId, OldId).

%% adr_chain(+AnyId, -Chain)
% Full ordered chain from AnyId to the current ADR (newest last).
% Cycle-safe via visited accumulator.
adr_chain(Id, Chain) :-
    adr_chain_acc(Id, [], Chain).
adr_chain_acc(Id, Visited, [Id]) :-
    \+ member(Id, Visited),
    \+ kb_relationship(supersedes, _, Id).
adr_chain_acc(Id, Visited, [Id|Rest]) :-
    \+ member(Id, Visited),
    kb_relationship(supersedes, Newer, Id),
    adr_chain_acc(Newer, [Id|Visited], Rest).

%% deprecated_no_successor(+OldId)
% Lint rule: ADR is archived/deprecated but has no supersedes relationship pointing to it.
deprecated_no_successor(Id) :-
    kb_entity(Id, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [archived, deprecated]),
    \+ kb_relationship(supersedes, _, Id).

%% current_req(+Id)
% Requirement is current when active and not superseded by another requirement.
current_req(Id) :-
    kb_entity(Id, req, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, active),
    \+ kb_relationship(supersedes, _, Id).

%% contradicting_reqs(-ReqA, -ReqB, -Reason)
% Two current requirements contradict if they constrain the same fact
% but require different properties.
contradicting_reqs(ReqA, ReqB, Reason) :-
    current_req(ReqA),
    current_req(ReqB),
    ReqA @< ReqB,
    kb_relationship(constrains, ReqA, FactId),
    kb_relationship(constrains, ReqB, FactId),
    kb_relationship(requires_property, ReqA, PropA),
    kb_relationship(requires_property, ReqB, PropB),
    PropA \= PropB,
    format(atom(Reason), 'Conflict on ~w: ~w vs ~w', [FactId, PropA, PropB]).

normalize_term_atom(Val^^_Type, Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(literal(type(_, Val)), Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(ValAtom, Val),
    normalize_uri_atom(ValAtom, Atom).
normalize_term_atom(Val, Atom) :-
    atom(Val),
    !,
    normalize_uri_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    term_string(Val, ValStr),
    atom_string(ValAtom, ValStr),
    normalize_uri_atom(ValAtom, Atom).

normalize_uri_atom(Value, Atom) :-
    (   sub_atom(Value, _, _, _, '/')
    ->  atomic_list_concat(Parts, '/', Value),
        last(Parts, Last),
        Atom = Last
    ;   Atom = Value
    ).

coerce_timestamp_atom(Val^^_Type, Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(literal(type(_, Val)), Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(Val, Atom) :-
    atom(Val),
    !,
    Atom = Val.
coerce_timestamp_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(Atom, Val).
coerce_timestamp_atom(Val, Atom) :-
    term_string(Val, Str),
    atom_string(Atom, Str).
```

## File: packages/core/tests/kb.plt
```
% PLUnit test suite for kb.pl
:- use_module('../src/kb.pl').
:- use_module(library(plunit)).
:- use_module(library(filesex)).

% Test KB directory
test_kb_dir('/tmp/kibi-test-kb').

:- begin_tests(kb_basic).

test(attach_detach_cycle, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    kb_attach(Dir),
    kb_detach.

test(attach_creates_directory, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    \+ exists_directory(Dir),
    kb_attach(Dir),
    exists_directory(Dir),
    kb_detach.

:- end_tests(kb_basic).

:- begin_tests(kb_entities).

test(assert_and_query_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='test-req-1',
        title="Test Requirement",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_entity('test-req-1', Type, Props),
    assertion(Type == req),
    % Check title property exists with RDF literal format
    memberchk(title=TitleVal, Props),
    assertion(TitleVal = ^^("Test Requirement", _)).

test(retract_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='test-req-2',
        title="To Be Deleted",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_entity('test-req-2', _, _),
    kb_retract_entity('test-req-2'),
    \+ kb_entity('test-req-2', _, _).

test(entity_validation_error, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Missing required property 'title' - should fail
    \+ kb_assert_entity(req, [
        id='test-req-3',
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Verify entity was NOT created
    \+ kb_entity('test-req-3', _, _).

:- end_tests(kb_entities).

:- begin_tests(kb_relationships).

test(assert_and_query_relationship, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Create two entities
    kb_assert_entity(req, [
        id='test-req-a',
        title="Requirement A",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='test-req-b',
        title="Requirement B",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Create relationship
    kb_assert_relationship(depends_on, 'test-req-a', 'test-req-b', []),
    % Query relationship
    kb_relationship(depends_on, 'test-req-a', 'test-req-b').

:- end_tests(kb_relationships).

:- begin_tests(kb_persistence).

test(journal_persistence, [setup(cleanup_test_kb), cleanup(cleanup_test_kb)]) :-
    test_kb_dir(Dir),
    % First session: attach, add entity, detach
    kb_attach(Dir),
    kb_assert_entity(req, [
        id='persistent-req',
        title="Persistent Entity",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_detach,
    % Second session: reattach and verify
    kb_attach(Dir),
    kb_entity('persistent-req', Type, Props),
    assertion(Type == req),
    memberchk(title=TitleVal, Props),
    assertion(TitleVal = ^^("Persistent Entity", _)),
    kb_detach.

:- end_tests(kb_persistence).

:- begin_tests(kb_audit).

test(audit_log_created, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='audit-test',
        title="Audit Test",
        status=draft,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    % Verify audit log entry exists (check database, not just file)
    changeset(_, upsert, 'audit-test', _).

:- end_tests(kb_audit).

:- begin_tests(kb_mutex).

test(mutex_protection, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    % Spawn multiple threads asserting entities concurrently
    numlist(1, 10, Nums),
    maplist(spawn_entity_thread, Nums, Threads),
    maplist(thread_join, Threads, _),
    % Verify all 10 thread entities exist
    findall(Id, (kb_entity(Id, req, _), atom_concat('thread-req-', _, Id)), ThreadIds),
    length(ThreadIds, 10).

spawn_entity_thread(N, ThreadId) :-
    atom_concat('thread-req-', N, Id),
    atom_concat('Thread Entity ', N, TitleAtom),
    atom_string(TitleAtom, Title),
    thread_create((
        kb_assert_entity(req, [
            id=Id,
            title=Title,
            status=draft,
            created_at="2026-02-17T00:00:00Z",
            updated_at="2026-02-17T00:00:00Z",
            source="test://kb.plt"
        ])
    ), ThreadId, []).

:- end_tests(kb_mutex).

:- begin_tests(kb_inference).

test(transitively_implements_direct, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-a',
        title="Req A",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(symbol, [
        id='sym-a',
        title="Sym A",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(implements, 'sym-a', 'req-a', []),
    transitively_implements('sym-a', 'req-a').

test(transitively_implements_via_test, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-b',
        title="Req B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    kb_assert_entity(test, [
        id='test-b',
        title="Test B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-b',
        title="Sym B",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(validates, 'test-b', 'req-b', []),
    kb_assert_relationship(covered_by, 'sym-b', 'test-b', []),
    transitively_implements('sym-b', 'req-b').

test(transitively_depends, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-1',
        title="Req 1",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-2',
        title="Req 2",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-3',
        title="Req 3",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-1', 'req-2', []),
    kb_assert_relationship(depends_on, 'req-2', 'req-3', []),
    transitively_depends('req-1', 'req-3').

test(coverage_gap_missing_both, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-gap',
        title="Req Gap",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt",
        priority=must
    ]),
    coverage_gap('req-gap', missing_scenario_and_test).

test(untested_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-untested',
        title="Sym Untested",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    untested_symbols(Symbols),
    memberchk('sym-untested', Symbols).

test(stale_entity, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-old',
        title="Old Req",
        status=active,
        created_at="2020-01-01T00:00:00Z",
        updated_at="2020-01-01T00:00:00Z",
        source="test://kb.plt"
    ]),
    stale('req-old', 30).

test(orphaned_symbol, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-orphan',
        title="Sym Orphan",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    orphaned('sym-orphan').

test(conflicting_adrs, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-conflict',
        title="Sym Conflict",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-1',
        title="ADR 1",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-2',
        title="ADR 2",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrained_by, 'sym-conflict', 'adr-1', []),
    kb_assert_relationship(constrained_by, 'sym-conflict', 'adr-2', []),
    conflicting('adr-1', 'adr-2').

test(deprecated_still_used, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(symbol, [
        id='sym-legacy',
        title="Sym Legacy",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(adr, [
        id='adr-legacy',
        title="ADR Legacy",
        status=archived,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrained_by, 'sym-legacy', 'adr-legacy', []),
    deprecated_still_used('adr-legacy', Symbols),
    memberchk('sym-legacy', Symbols).

test(impacted_by_change, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-main',
        title="Req Main",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-dependent',
        title="Req Dep",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-dependent', 'req-main', []),
    impacted_by_change('req-dependent', 'req-main').

test(affected_symbols, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(req, [
        id='req-base',
        title="Req Base",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-child',
        title="Req Child",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(symbol, [
        id='sym-child',
        title="Sym Child",
        status=active,
        created_at="2026-02-17T00:00:00Z",
        updated_at="2026-02-17T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(depends_on, 'req-child', 'req-base', []),
    kb_assert_relationship(implements, 'sym-child', 'req-child', []),
    affected_symbols('req-base', Symbols),
    memberchk('sym-child', Symbols).

test(contradicting_reqs, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='fact-user-role',
        title="User Role Assignment",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-2',
        title="Maximum of Two",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-3',
        title="Maximum of Three",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-2',
        title="Users have max 2 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-3',
        title="Users have max 3 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', []),
    kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', []),
    kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', []),
    kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', []),
    contradicting_reqs('req-role-2', 'req-role-3', _).

test(contradicting_reqs_ignores_superseded, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity(fact, [
        id='fact-user-role',
        title="User Role Assignment",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-2',
        title="Maximum of Two",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(fact, [
        id='fact-limit-3',
        title="Maximum of Three",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-2',
        title="Users have max 2 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_entity(req, [
        id='req-role-3',
        title="Users have max 3 roles",
        status=active,
        created_at="2026-02-20T00:00:00Z",
        updated_at="2026-02-20T00:00:00Z",
        source="test://kb.plt"
    ]),
    kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', []),
    kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', []),
    kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', []),
    kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', []),
    kb_assert_relationship(supersedes, 'req-role-3', 'req-role-2', []),
    \+ contradicting_reqs(_, _, _).

:- end_tests(kb_inference).

% Test setup/cleanup helpers
setup_kb :-
    cleanup_test_kb,
    test_kb_dir(Dir),
    kb_attach(Dir).

cleanup_kb :-
    kb_detach,
    cleanup_test_kb.

cleanup_test_kb :-
    test_kb_dir(Dir),
    (   exists_directory(Dir)
    ->  delete_directory_and_contents(Dir)
    ;   true
    ).
```

## File: packages/core/tests/schema.plt
```
:- begin_tests(schema).

:- use_module(library(plunit)).
:- use_module('packages/core/schema/entities.pl').
:- use_module('packages/core/schema/relationships.pl').
:- use_module('packages/core/schema/validation.pl').

test(entity_types_count) :-
    findall(T, entity_type(T), Ts),
    sort(Ts, Sorted),
    Sorted == [adr,event,fact,flag,req,scenario,symbol,test].

test(relationship_types_count) :-
    findall(R, relationship_type(R), Rs),
    sort(Rs, Sorted),
    % relationship_type/1 includes 14 items; ensure length and membership
    length(Sorted, 14),
    member(depends_on, Sorted),
    member(specified_by, Sorted),
    member(verified_by, Sorted),
    member(constrains, Sorted),
    member(requires_property, Sorted).

test(valid_relationship_ok) :-
    validate_relationship(depends_on, req, req).

test(invalid_relationship_bad_types) :-
    \+ validate_relationship(depends_on, invalid, req).

test(missing_required_property) :-
    % missing title
    Props = [id=foo, status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    \+ validate_entity(req, Props).

test(invalid_property_type) :-
    Props = [id=foo, title=Title, status=active, created_at=123, updated_at="2020-01-01", source="http://x"],
    Title = "A title",
    \+ validate_entity(req, Props).

test(valid_entity) :-
    Props = [id=foo, title="T", status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    validate_entity(req, Props).

:- end_tests(schema).
```

## File: packages/core/package.json
```json
{
  "name": "@kibi/core",
  "version": "0.1.0",
  "private": true,
  "description": "Core Prolog modules for Kibi (placeholder)"
}
```

## File: packages/mcp/bin/kibi-mcp
```
#!/usr/bin/env bun
import { startServer } from "../src/server.js";

// Debug wrapper to log all stdio traffic
if (process.env.KIBI_MCP_DEBUG) {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  
  process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
    const str = chunk.toString().trim();
    if (str) {
      originalStderrWrite(`[KIBI-MCP-OUT] ${str}\n`);
    }
    return originalStdoutWrite(chunk, encoding, callback);
  };
  
  // Log incoming stdin data
  process.stdin.on('data', (data) => {
    const str = data.toString().trim();
    if (str) {
      originalStderrWrite(`[KIBI-MCP-IN] ${str}\n`);
    }
  });
}

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[KIBI-MCP] Unhandled rejection at promise:', promise);
  console.error('[KIBI-MCP] Reason:', reason);
  if (reason instanceof Error) {
    console.error('[KIBI-MCP] Stack:', reason.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[KIBI-MCP] Uncaught exception:', error.message);
  console.error('[KIBI-MCP] Stack:', error.stack);
  process.exit(1);
});

startServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-1.md](file:kibi-01-logic-1.md)

#### ⏭️ NEXT PART: [kibi-01-logic-3.md](file:kibi-01-logic-3.md)

> _End of Part 3_
