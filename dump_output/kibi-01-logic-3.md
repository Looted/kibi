# Pack: kibi-01-logic (Part 3)


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
  mcp/
    src/
      tools/
        branch.ts
        check.ts
        context.ts
        coverage-report.ts
        delete.ts
      env.ts
      mcpcat.ts
      server.ts
      tools-config.ts
    package.json
```

# Files

## File: packages/mcp/src/tools/branch.ts
````typescript
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { resolveKbPath, resolveWorkspaceRoot } from "../workspace.js";

export interface BranchEnsureArgs {
  branch: string;
}

export interface BranchEnsureResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: boolean;
    path: string;
  };
}

export interface BranchGcArgs {
  dry_run?: boolean;
}

export interface BranchGcResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    stale: string[];
    deleted: number;
  };
}

/**
 * Handle kb_branch_ensure tool calls - create branch KB if not exists
 */
export async function handleKbBranchEnsure(
  _prolog: PrologProcess,
  args: BranchEnsureArgs,
): Promise<BranchEnsureResult> {
  const { branch } = args;

  if (!branch || branch.trim() === "") {
    throw new Error("Branch name is required");
  }

  // Sanitize branch name (prevent path traversal)
  const isSafe = (name: string) => {
    // No empty or excessively long names
    if (!name || name.length > 255) return false;
    // No path traversal or absolute paths
    if (name.includes("..") || path.isAbsolute(name) || name.startsWith("/")) {
      return false;
    }
    // Whitelist characters (alphanumeric, dot, underscore, hyphen, forward slash)
    if (!/^[a-zA-Z0-9._\-/]+$/.test(name)) return false;
    // No redundant slashes or trailing slash/dot
    if (
      name.includes("//") ||
      name.endsWith("/") ||
      name.endsWith(".") ||
      name.includes("\\")
    ) {
      return false;
    }

    return true;
  };

  if (!isSafe(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }
  const safeBranch = branch;

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const branchPath = resolveKbPath(workspaceRoot, safeBranch);
    const developPath = resolveKbPath(workspaceRoot, "develop");

    // Check if branch KB already exists
    if (fs.existsSync(branchPath)) {
      return {
        content: [
          {
            type: "text",
            text: `Branch KB '${safeBranch}' already exists`,
          },
        ],
        structuredContent: {
          created: false,
          path: branchPath,
        },
      };
    }

    // Ensure develop branch exists
    if (!fs.existsSync(developPath)) {
      throw new Error("Develop branch KB does not exist. Run 'kb init' first.");
    }

    // Copy develop branch KB to new branch
    fs.cpSync(developPath, branchPath, { recursive: true });

    return {
      content: [
        {
          type: "text",
          text: `Created branch KB '${safeBranch}' from develop`,
        },
      ],
      structuredContent: {
        created: true,
        path: branchPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch ensure failed: ${message}`);
  }
}

/**
 * Handle kb_branch_gc tool calls - garbage collect stale branch KBs
 */
export async function handleKbBranchGc(
  _prolog: PrologProcess,
  args: BranchGcArgs,
): Promise<BranchGcResult> {
  const { dry_run = true } = args;

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const kbRoot = path.dirname(resolveKbPath(workspaceRoot, "develop"));

    // Check if .kb/branches exists
    if (!fs.existsSync(kbRoot)) {
      return {
        content: [
          {
            type: "text",
            text: "No branch KBs found (.kb/branches does not exist)",
          },
        ],
        structuredContent: {
          stale: [],
          deleted: 0,
        },
      };
    }

    let gitBranches: Set<string>;
    try {
      execSync("git rev-parse --git-dir", {
        encoding: "utf-8",
        cwd: workspaceRoot,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const output = execSync("git branch --format='%(refname:short)'", {
        encoding: "utf-8",
        cwd: workspaceRoot,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });
      gitBranches = new Set(
        output
          .trim()
          .split("\n")
          .map((b) => b.trim().replace(/^'|'$/g, ""))
          .filter((b) => b),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Not in a git repository or git command failed: ${message}`,
      );
    }

    // Get all KB branches
    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Find stale branches (KB exists but git branch doesn't, excluding develop)
    const staleBranches = kbBranches.filter(
      (kb) => kb !== "develop" && !gitBranches.has(kb),
    );

    // Delete stale branches if not dry run
    let deletedCount = 0;
    if (!dry_run && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    const summary = dry_run
      ? `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`
      : `Deleted ${deletedCount} stale branch KB(s)`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        stale: staleBranches,
        deleted: deletedCount,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch GC failed: ${message}`);
  }
}
````

## File: packages/mcp/src/tools/check.ts
````typescript
import * as path from "node:path";
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { parsePairList } from "./prolog-list.js";

export interface CheckArgs {
  rules?: string[];
}

interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export interface CheckResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    violations: Violation[];
    count: number;
  };
}

/**
 * Handle kb_check tool calls - run validation rules on the KB
 * Reuses validation logic from CLI check command
 */
export async function handleKbCheck(
  prolog: PrologProcess,
  args: CheckArgs,
): Promise<CheckResult> {
  const { rules } = args;

  try {
    const violations: Violation[] = [];

    const allEntityIds = await getAllEntityIds(prolog);

    // Run all validation rules (or specific rules if provided)
    const allRules = [
      "must-priority-coverage",
      "no-dangling-refs",
      "no-cycles",
      "required-fields",
    ];
    const rulesToRun = rules && rules.length > 0 ? rules : allRules;

    if (rulesToRun.includes("must-priority-coverage")) {
      violations.push(...(await checkMustPriorityCoverage(prolog)));
    }

    if (rulesToRun.includes("no-dangling-refs")) {
      violations.push(...(await checkNoDanglingRefs(prolog)));
    }

    if (rulesToRun.includes("no-cycles")) {
      violations.push(...(await checkNoCycles(prolog)));
    }

    if (rulesToRun.includes("required-fields")) {
      violations.push(...(await checkRequiredFields(prolog, allEntityIds)));
    }

    // Return MCP structured response
    const summary =
      violations.length === 0
        ? "No violations found"
        : `${violations.length} violations found`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        violations,
        count: violations.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const gapsResult = await prolog.query(
    "setof([Req,Reason], coverage_gap(Req, Reason), Rows)",
  );
  if (!gapsResult.success || !gapsResult.bindings.Rows) {
    return violations;
  }

  const gaps = parsePairList(gapsResult.bindings.Rows);
  for (const [reqId, reason] of gaps) {
    const entityResult = await prolog.query(
      `kb_entity('${reqId}', req, Props)`,
    );
    let source = "";
    if (entityResult.success && entityResult.bindings.Props) {
      const propsStr = entityResult.bindings.Props;
      const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
      if (sourceMatch) {
        source = sourceMatch[1];
      }
    }

    const missing: string[] = [];
    if (reason.includes("scenario")) {
      missing.push("scenario");
    }
    if (reason.includes("test")) {
      missing.push("test");
    }

    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${missing.join(" and ")} coverage`,
      source,
      suggestion: missing
        .map((m) => `Create ${m} that covers this requirement`)
        .join("; "),
    });
  }

  return violations;
}

async function getAllEntityIds(
  prolog: PrologProcess,
  type?: string,
): Promise<string[]> {
  const typeFilter = type ? `, Type = ${type}` : "";
  const query = `findall(Id, (kb_entity(Id, Type, _)${typeFilter}), Ids)`;

  const result = await prolog.query(query);

  if (!result.success || !result.bindings.Ids) {
    return [];
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  if (!match) {
    return [];
  }

  const content = match[1].trim();
  if (!content) {
    return [];
  }

  return content.split(",").map((id) => id.trim().replace(/^'|'$/g, ""));
}

async function checkNoDanglingRefs(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Get all entity IDs once
  const allEntityIds = new Set(await getAllEntityIds(prolog));

  // Get all relationships by querying all known relationship types
  const relTypes = [
    "depends_on",
    "verified_by",
    "validates",
    "specified_by",
    "relates_to",
  ];

  const allRels: Array<{ from: string; to: string }> = [];

  for (const relType of relTypes) {
    const relsResult = await prolog.query(
      `findall([From,To], kb_relationship(${relType}, From, To), Rels)`,
    );

    if (relsResult.success && relsResult.bindings.Rels) {
      const relsStr = relsResult.bindings.Rels;
      const match = relsStr.match(/\[(.*)\]/);
      if (match) {
        const content = match[1].trim();
        if (content) {
          const relMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);
          for (const relMatch of relMatches) {
            const fromId = relMatch[1].trim().replace(/^'|'$/g, "");
            const toId = relMatch[2].trim().replace(/^'|'$/g, "");
            allRels.push({ from: fromId, to: toId });
          }
        }
      }
    }
  }

  // Check all collected relationships for dangling refs
  for (const rel of allRels) {
    if (!allEntityIds.has(rel.from)) {
      violations.push({
        rule: "no-dangling-refs",
        entityId: rel.from,
        description: `Relationship references non-existent entity: ${rel.from}`,
        suggestion: "Remove relationship or create missing entity",
      });
    }

    if (!allEntityIds.has(rel.to)) {
      violations.push({
        rule: "no-dangling-refs",
        entityId: rel.to,
        description: `Relationship references non-existent entity: ${rel.to}`,
        suggestion: "Remove relationship or create missing entity",
      });
    }
  }

  return violations;
}

async function checkNoCycles(prolog: PrologProcess): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Get all depends_on relationships
  const depsResult = await prolog.query(
    "findall([From,To], kb_relationship(depends_on, From, To), Deps)",
  );

  if (!depsResult.success || !depsResult.bindings.Deps) {
    return violations;
  }

  const depsStr = depsResult.bindings.Deps;
  const match = depsStr.match(/\[(.*)\]/);
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  // Build adjacency map
  const graph = new Map<string, string[]>();
  const depMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);

  for (const depMatch of depMatches) {
    const from = depMatch[1].trim().replace(/^'|'$/g, "");
    const to = depMatch[2].trim().replace(/^'|'$/g, "");

    if (!graph.has(from)) {
      graph.set(from, []);
    }
    const fromList = graph.get(from);
    if (fromList) {
      fromList.push(to);
    }
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleDFS(node: string, path: string[]): string[] | null {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclePath = hasCycleDFS(neighbor, [...path]);
        if (cyclePath) return cyclePath;
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        return [...path, neighbor];
      }
    }

    recStack.delete(node);
    return null;
  }

  // Check each node for cycles
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const cyclePath = hasCycleDFS(node, []);
      if (cyclePath) {
        const cycleWithSources: string[] = [];
        for (const entityId of cyclePath) {
          const entityResult = await prolog.query(
            `kb_entity('${entityId}', _, Props)`,
          );
          let sourceName = entityId;
          if (entityResult.success && entityResult.bindings.Props) {
            const propsStr = entityResult.bindings.Props;
            const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
            if (sourceMatch) {
              sourceName = path.basename(sourceMatch[1], ".md");
            }
          }
          cycleWithSources.push(sourceName);
        }

        violations.push({
          rule: "no-cycles",
          entityId: cyclePath[0],
          description: `Circular dependency detected: ${cycleWithSources.join(" → ")}`,
          suggestion:
            "Break the cycle by removing one of the depends_on relationships",
        });
        break; // Report only first cycle found
      }
    }
  }

  return violations;
}

async function checkRequiredFields(
  prolog: PrologProcess,
  allEntityIds: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const required = [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "source",
  ];

  for (const entityId of allEntityIds) {
    const result = await prolog.query(`kb_entity('${entityId}', Type, Props)`);

    if (result.success && result.bindings.Props) {
      // Parse properties list: [key1=value1, key2=value2, ...]
      const propsStr = result.bindings.Props;
      const propKeys = new Set<string>();

      // Extract keys from Props
      const keyMatches = propsStr.matchAll(/(\w+)\s*=/g);
      for (const match of keyMatches) {
        propKeys.add(match[1]);
      }

      // Check for missing required fields
      for (const field of required) {
        if (!propKeys.has(field)) {
          violations.push({
            rule: "required-fields",
            entityId: entityId,
            description: `Missing required field: ${field}`,
            suggestion: `Add ${field} to entity definition`,
          });
        }
      }
    }
  }

  return violations;
}
````

## File: packages/mcp/src/tools/context.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface ContextArgs {
  sourceFile: string;
  branch?: string;
}

export interface ContextResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    sourceFile: string;
    entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }>;
    relationships: Array<{ relType: string; fromId: string; toId: string }>;
    provenance: {
      predicate: string;
      deterministic: boolean;
    };
  };
}

export async function handleKbContext(
  prolog: PrologProcess,
  args: ContextArgs,
  activeBranch?: string,
): Promise<ContextResult> {
  const { sourceFile, branch } = args;

  if (branch && activeBranch && branch !== activeBranch) {
    return {
      content: [
        {
          type: "text",
          text: `Error: branch parameter is not supported server-side; set KIBI_BRANCH at startup or restart server on the desired branch. (Requested: ${branch}, Active: ${activeBranch})`,
        },
      ],
    };
  }

  try {
    const safeSource = sourceFile.replace(/'/g, "\\'");

    const entityGoal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
    const entityQueryResult = await prolog.query(entityGoal);

    const entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }> = [];
    const entityIds: string[] = [];

    if (entityQueryResult.success && entityQueryResult.bindings.Results) {
      const entitiesData = parseListOfLists(entityQueryResult.bindings.Results);

      for (const data of entitiesData) {
        const entity = parseEntityFromList(data);
        entities.push({
          id: entity.id as string,
          type: entity.type as string,
          title: entity.title as string,
          status: entity.status as string,
          tags: (entity.tags as string[]) || [],
        });
        entityIds.push(entity.id as string);
      }
    }

    const relationships: Array<{
      relType: string;
      fromId: string;
      toId: string;
    }> = [];

    for (const entityId of entityIds) {
      const relGoal = `findall([RelType,FromId,ToId], (kb_relationship(RelType, FromId, ToId), (FromId = '${entityId}' ; ToId = '${entityId}')), RelResults)`;
      const relQueryResult = await prolog.query(relGoal);

      if (relQueryResult.success && relQueryResult.bindings.RelResults) {
        const relData = parseListOfLists(relQueryResult.bindings.RelResults);

        for (const rel of relData) {
          relationships.push({
            relType: rel[0],
            fromId: rel[1],
            toId: rel[2],
          });
        }
      }
    }

    const text =
      entities.length > 0
        ? `Found ${entities.length} KB entities linked to source file "${sourceFile}": ${entities.map((e) => e.id).join(", ")}`
        : `No KB entities found for source file "${sourceFile}"`;

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        sourceFile,
        entities,
        relationships,
        provenance: {
          predicate: "kb_entities_by_source",
          deterministic: true,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Context query failed: ${message}`);
  }
}

function parseListOfLists(listStr: string): string[][] {
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "[") {
      depth++;
      if (depth > 1) current += char;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        if (current) {
          currentList.push(current.trim());
          current = "";
        }
        if (currentList.length > 0) {
          results.push(currentList);
          currentList = [];
        }
      } else {
        current += char;
      }
    } else if (char === "," && depth === 1) {
      if (current) {
        currentList.push(current.trim());
        current = "";
      }
    } else if (char === "," && depth === 0) {
    } else {
      current += char;
    }
  }

  return results;
}

function parseEntityFromList(data: string[]): Record<string, unknown> {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

function parsePropertyList(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  const pairs = splitTopLevel(cleaned, ",");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.substring(0, eqIndex).trim();
    const value = pair.substring(eqIndex + 1).trim();

    if (key === "..." || value === "..." || value === "...|...") {
      continue;
    }

    const parsed = parsePrologValue(value);
    props[key] = parsed;
  }

  return props;
}

function parsePrologValue(valueInput: string): unknown {
  const value = valueInput.trim();

  if (value.startsWith("^^(")) {
    const innerStart = value.indexOf("(") + 1;
    let depth = 1;
    let innerEnd = innerStart;
    for (let i = innerStart; i < value.length; i++) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") {
        depth--;
        if (depth === 0) {
          innerEnd = i;
          break;
        }
      }
    }
    const innerContent = value.substring(innerStart, innerEnd);

    const parts = splitTopLevel(innerContent, ",");
    if (parts.length >= 2) {
      let literalValue = parts[0].trim();

      if (literalValue.startsWith('"') && literalValue.endsWith('"')) {
        literalValue = literalValue.substring(1, literalValue.length - 1);
      }

      if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
        const listContent = literalValue.substring(1, literalValue.length - 1);
        if (listContent === "") {
          return [];
        }
        return listContent.split(",").map((item) => item.trim());
      }

      return literalValue;
    }
  }

  if (value.startsWith("file:///")) {
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash !== -1) {
      return value.substring(lastSlash + 1);
    }
    return value;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    if (listContent === "") {
      return [];
    }
    const items = listContent.split(",").map((item) => {
      return parsePrologValue(item.trim());
    });
    return items;
  }

  return value;
}

function splitTopLevel(str: string, delimiter: string): string[] {
  const results: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "[" || char === "(")) {
      depth++;
      current += char;
    } else if (!inQuotes && (char === "]" || char === ")")) {
      depth--;
      current += char;
    } else if (!inQuotes && depth === 0 && char === delimiter) {
      if (current) {
        results.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeEntityId(value: string): string {
  if (!value.startsWith("file:///")) {
    return value;
  }

  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}
````

## File: packages/mcp/src/tools/coverage-report.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";
import { parseAtomList, parsePairList } from "./prolog-list.js";

type CoverageType = "req" | "symbol";

export interface CoverageReportArgs {
  type?: CoverageType;
}

export interface CoverageReportResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    requested_type: CoverageType | "all";
    coverage: {
      requirements?: {
        total: number;
        with_gaps: number;
        healthy: number;
        gaps: Array<{ req: string; reason: string }>;
      };
      symbols?: {
        total: number;
        untested: number;
        tested: number;
        untested_symbols: string[];
      };
    };
    provenance: {
      deterministic: true;
      predicates: string[];
    };
  };
}

export async function handleKbCoverageReport(
  prolog: PrologProcess,
  args: CoverageReportArgs,
): Promise<CoverageReportResult> {
  const requested = args.type ?? "all";
  if (args.type && args.type !== "req" && args.type !== "symbol") {
    throw new Error("'type' must be one of: req, symbol");
  }

  const coverage: CoverageReportResult["structuredContent"]["coverage"] = {};
  const predicates: string[] = [];

  if (requested === "all" || requested === "req") {
    const reqIds = await queryAtoms(
      prolog,
      "setof(Req, kb_entity(Req, req, _), Reqs)",
      "Reqs",
    );
    const gapPairs = await queryPairs(
      prolog,
      "setof([Req,Reason], coverage_gap(Req, Reason), Rows)",
      "Rows",
    );

    const gaps = gapPairs.map(([req, reason]) => ({ req, reason }));
    coverage.requirements = {
      total: reqIds.length,
      with_gaps: gaps.length,
      healthy: Math.max(reqIds.length - gaps.length, 0),
      gaps,
    };
    predicates.push("coverage_gap");
  }

  if (requested === "all" || requested === "symbol") {
    const symbolIds = await queryAtoms(
      prolog,
      "setof(Symbol, kb_entity(Symbol, symbol, _), Symbols)",
      "Symbols",
    );
    const untestedResult = await prolog.query("untested_symbols(Symbols)");
    const untestedSymbols =
      untestedResult.success && untestedResult.bindings.Symbols
        ? parseAtomList(untestedResult.bindings.Symbols)
        : [];

    coverage.symbols = {
      total: symbolIds.length,
      untested: untestedSymbols.length,
      tested: Math.max(symbolIds.length - untestedSymbols.length, 0),
      untested_symbols: untestedSymbols,
    };
    predicates.push("untested_symbols");
  }

  const summaryParts: string[] = [];
  if (coverage.requirements) {
    summaryParts.push(
      `${coverage.requirements.healthy}/${coverage.requirements.total} requirements healthy`,
    );
  }
  if (coverage.symbols) {
    summaryParts.push(
      `${coverage.symbols.tested}/${coverage.symbols.total} symbols tested`,
    );
  }

  return {
    content: [
      {
        type: "text",
        text:
          summaryParts.length > 0
            ? `Coverage report: ${summaryParts.join("; ")}.`
            : "Coverage report: no data.",
      },
    ],
    structuredContent: {
      requested_type: requested,
      coverage,
      provenance: {
        deterministic: true,
        predicates,
      },
    },
  };
}

async function queryAtoms(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<string[]> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parseAtomList(result.bindings[bindingName]);
}

async function queryPairs(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<Array<[string, string]>> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parsePairList(result.bindings[bindingName]);
}
````

## File: packages/mcp/src/tools/delete.ts
````typescript
import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface DeleteArgs {
  ids: string[];
}

export interface DeleteResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    deleted: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * Handle kb.delete tool calls
 * Prevents deletion of entities with dependents (referential integrity)
 */
export async function handleKbDelete(
  prolog: PrologProcess,
  args: DeleteArgs,
): Promise<DeleteResult> {
  const { ids } = args;

  if (!ids || ids.length === 0) {
    throw new Error("At least one ID required for delete");
  }

  let deleted = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const id of ids) {
      // Check if entity exists
      const checkGoal = `kb_entity('${id}', _, _)`;
      const checkResult = await prolog.query(checkGoal);

      if (!checkResult.success) {
        errors.push(`Entity ${id} does not exist`);
        skipped++;
        continue;
      }

      // Check for dependents (entities that reference this one)
      // Query each relationship type separately to avoid timeout with unbound Type
      const relTypes = [
        "depends_on",
        "verified_by",
        "validates",
        "specified_by",
        "relates_to",
        "guards",
        "publishes",
        "consumes",
      ];
      let hasDependents = false;

      for (const relType of relTypes) {
        const dependentsGoal = `findall(From, kb_relationship(${relType}, From, '${id}'), Dependents)`;
        const dependentsResult = await prolog.query(dependentsGoal);

        if (dependentsResult.success && dependentsResult.bindings.Dependents) {
          const dependentsStr = dependentsResult.bindings.Dependents;
          if (dependentsStr !== "[]") {
            errors.push(
              `Cannot delete entity ${id}: has dependents (other entities reference it via ${relType})`,
            );
            skipped++;
            hasDependents = true;
            break;
          }
        }
      }

      if (hasDependents) {
        continue;
      }

      // No dependents, safe to delete
      const deleteGoal = `kb_retract_entity('${id}')`;
      const deleteResult = await prolog.query(deleteGoal);

      if (!deleteResult.success) {
        errors.push(
          `Failed to delete entity ${id}: ${deleteResult.error || "Unknown error"}`,
        );
        skipped++;
      } else {
        deleted++;
      }
    }

    // Save KB to disk
    await prolog.query("kb_save");

    return {
      content: [
        {
          type: "text",
          text: `Deleted ${deleted} entities. Skipped ${skipped}. ${errors.length > 0 ? `Errors: ${errors.join("; ")}` : ""}`,
        },
      ],
      structuredContent: {
        deleted,
        skipped,
        errors,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Delete execution failed: ${message}`);
  }
}
````

## File: packages/mcp/src/env.ts
````typescript
import fs from "node:fs";
import { resolveEnvFilePath, resolveWorkspaceRoot } from "./workspace.js";

const DEFAULT_ENV_FILE = ".env";
const envFileName = process.env.KIBI_ENV_FILE ?? DEFAULT_ENV_FILE;
const workspaceRoot = resolveWorkspaceRoot();
const envFilePath = resolveEnvFilePath(envFileName, workspaceRoot);

if (fs.existsSync(envFilePath)) {
  try {
    const raw = fs.readFileSync(envFilePath, "utf8");
    for (const { key, value } of parseEnvContent(raw)) {
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
        continue;
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.error(
      `[Kibi] Unable to load environment file ${envFilePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

interface EnvEntry {
  key: string;
  value: string;
}

function parseEnvContent(content: string): EnvEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: EnvEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}
````

## File: packages/mcp/src/mcpcat.ts
````typescript
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as mcpcat from "mcpcat";
import { resolveWorkspaceRoot } from "./workspace.js";

const projectId = (process.env.MCPCAT_PROJECT_ID ?? "").trim();
const trackedIdentity = resolveTrackedIdentity();

/**
 * Attach mcpcat analytics tracking to the MCP server.
 *
 * NOTE ON SESSIONS: With stdio transport, many MCP clients (including OpenCode)
 * spawn a new process for each tool call. This means each tool call gets a new
 * MCP session ID, resulting in single-tool-call "sessions" in mcpcat.
 *
 * This is expected behavior for stdio transport - each process IS a different
 * session. User identity (via the identify() function) still provides useful
 * aggregation across all tool calls from the same user/machine.
 *
 * For true session aggregation, clients would need to either:
 * 1. Use HTTP transport with persistent connections
 * 2. Maintain long-lived stdio connections across multiple tool calls
 * 3. Implement custom session headers
 */
export function attachMcpcat(server: McpServer): void {
  if (!projectId) {
    return;
  }

  try {
    mcpcat.track(server, projectId, {
      identify: async () => trackedIdentity,
      enableReportMissing: false, // Don't add get_more_tools tool - it's internal
      enableTracing: true,
      enableToolCallContext: false, // Don't inject context parameter into tools
    });
    if (process.env.KIBI_MCP_DEBUG) {
      console.error(
        `[KIBI-MCP] MCPcat tracking enabled for project ${projectId}`,
      );
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[KIBI-MCP] MCPcat tracking attach failed: ${details}`);
  }
}

function resolveTrackedIdentity(): mcpcat.UserIdentity {
  const explicitUserId = readEnv("MCPCAT_USER_ID");
  if (explicitUserId) {
    return {
      userId: explicitUserId,
      userName: readEnv("MCPCAT_USER_NAME") ?? "local-operator",
      userData: { identitySource: "env" },
    };
  }

  const repoRoot = findRepoRoot(resolveWorkspaceRoot());
  const repoName = path.basename(repoRoot);
  const username = readEnv("USER") ?? readEnv("USERNAME") ?? "unknown-user";
  const host = os.hostname() || "unknown-host";
  const stableId = createHash("sha256")
    .update(`${host}:${username}:${repoRoot}`)
    .digest("hex")
    .slice(0, 24);

  return {
    userId: `anon_${stableId}`,
    userName: `local-${repoName}`,
    userData: { identitySource: "host-user-repo-hash", repo: repoName },
  };
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const gitMarker = path.join(current, ".git");
    if (fs.existsSync(gitMarker)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}
````

## File: packages/mcp/src/server.ts
````typescript
import "./env.js";
import process from "node:process";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { attachMcpcat } from "./mcpcat.js";
import {
  type BranchEnsureArgs,
  type BranchGcArgs,
  handleKbBranchEnsure,
  handleKbBranchGc,
} from "./tools/branch.js";
import { type CheckArgs, handleKbCheck } from "./tools/check.js";
import { type ContextArgs, handleKbContext } from "./tools/context.js";
import {
  type CoverageReportArgs,
  handleKbCoverageReport,
} from "./tools/coverage-report.js";
import { type DeleteArgs, handleKbDelete } from "./tools/delete.js";
import { type DeriveArgs, handleKbDerive } from "./tools/derive.js";
import { type ImpactArgs, handleKbImpact } from "./tools/impact.js";
import {
  type QueryRelationshipsArgs,
  handleKbQueryRelationships,
} from "./tools/query-relationships.js";
import { type QueryArgs, handleKbQuery } from "./tools/query.js";
import {
  type SymbolsRefreshArgs,
  handleKbSymbolsRefresh,
} from "./tools/symbols.js";
import { type UpsertArgs, handleKbUpsert } from "./tools/upsert.js";
import {
  type ListEntityTypesResult,
  type ListRelationshipTypesResult,
  handleKbListEntityTypes,
  handleKbListRelationshipTypes,
} from "./tools/list-types.js";
import { resolveKbPath, resolveWorkspaceRoot } from "./workspace.js";
import { TOOLS } from "./tools-config.js";

interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
}



function renderToolsDoc(): string {
  const lines = [
    "# kibi-mcp Tools",
    "",
    "Use this reference to choose the correct tool before calling it.",
    "",
    "| Tool | Summary | Required Parameters |",
    "| --- | --- | --- |",
  ];

  for (const tool of TOOLS) {
    const required = Array.isArray(tool.inputSchema?.required)
      ? tool.inputSchema.required.join(", ")
      : "none";
    lines.push(`| ${tool.name} | ${tool.description} | ${required} |`);
  }

  return lines.join("\n");
}

const PROMPTS = [
  {
    name: "kibi_overview",
    description: "High-level model for using kibi-mcp safely and effectively.",
    text: [
      "# kibi-mcp Overview",
      "",
      "Treat this server as a branch-aware knowledge graph interface for software traceability.",
      "",
      "- Encode requirements as linked facts: `req --constrains--> fact` plus `req --requires_property--> fact`.",
      "- Reuse canonical fact IDs across requirements; shared constrained facts make contradictions detectable.",
      "- Use read tools first (`kb_query`, `kb_query_relationships`, `kbcontext`) to establish context.",
      "- Use mutation tools (`kb_upsert`, `kb_delete`, branch tools) only after you can justify the change.",
      "- Use inference tools (`kb_derive`, `kb_impact`, `kb_coverage_report`) for deterministic analysis.",
      "- Prefer explicit IDs and enum values to avoid invalid parameters.",
      "- Assume every write can affect downstream traceability queries.",
    ].join("\n"),
  },
  {
    name: "kibi_workflow",
    description:
      "Step-by-step call order for discovery, mutation, and verification.",
    text: [
      "# kibi-mcp Workflow",
      "",
      "Follow this sequence for reliable operation:",
      "",
      "1. **Discover**: Call `kb_list_entity_types`/`kb_list_relationship_types` if you are unsure about allowed values.",
      "2. **Inspect**: Call `kb_query` or `kbcontext` to confirm current state before any mutation.",
      "3. **Model requirements as facts**: For new/updated reqs, create/reuse fact entities first, then express req semantics with `constrains` + `requires_property`.",
      "4. **Validate intent**: If creating links, call `kb_query` for both endpoint IDs first.",
      "5. **Mutate**: Call `kb_upsert` for create/update, or `kb_delete` for explicit removals.",
      "6. **Verify integrity**: Call `kb_check` after mutations.",
      "7. **Assess impact**: Call `kb_impact`, `kb_derive`, or `kb_coverage_report` as needed.",
      "",
      "If a tool returns empty results, do not assume failure. Re-check filters (type, id, tags, sourceFile, or relationship type).",
    ].join("\n"),
  },
  {
    name: "kibi_constraints",
    description: "Operational limits, validation rules, and mutation gotchas.",
    text: [
      "# kibi-mcp Constraints",
      "",
      "Apply these rules before calling write operations:",
      "",
      "- `kb_upsert` validates entity and relationship payloads against JSON Schema.",
      "- `kb_delete` blocks deletion when dependents still reference the entity.",
      "- `kb_branch_gc` may permanently remove stale branch KB directories when `dry_run` is `false`.",
      "- Relationship and rule names are strict enums; unknown values fail validation.",
      "- Branch names are sanitized; path traversal patterns are rejected.",
      "- `kb_symbols_refresh` can rewrite the symbols manifest unless `dryRun` is enabled.",
    ].join("\n"),
  },
];

function registerDocResources(): DocResource[] {
  const overview = [
    "# kibi-mcp Server Overview",
    "",
    "kibi-mcp is a stdio MCP server for querying and mutating the Kibi knowledge base.",
    "",
    "Scope:",
    "- Entity CRUD-like operations for KB records",
    "- Relationship inspection",
    "- Validation and branch KB maintenance",
    "- Deterministic inference for traceability and impact analysis",
    "",
    "Use this server when you need branch-local, machine-readable project memory.",
  ].join("\n");

  const errors = [
    "# kibi-mcp Error Guide",
    "",
    "Common failure modes and recoveries:",
    "",
    "- `-32602 INVALID_PARAMS`: Tool arguments are missing/invalid. Recover by checking enum values and required fields.",
    "- `-32601 METHOD_NOT_FOUND`: Unknown MCP method. Recover by using supported methods (`tools/*`, `prompts/*`, `resources/*`).",
    "- `-32000 PROLOG_QUERY_FAILED`: Prolog query failed. Recover by validating IDs, rule names, and relationship types.",
    "- `VALIDATION_ERROR` message: `kb_upsert` payload failed schema checks. Recover by fixing required fields and enum values.",
    "- Delete blocked by dependents: `kb_delete` detected incoming references. Recover by removing/rewiring relationships first.",
    "- Empty results: filters may be too strict. Recover by loosening type/id/tags/source filters and retrying.",
  ].join("\n");

  const examples = [
    "# kibi-mcp Examples",
    "",
    "## Model requirements as reusable facts",
    "1. `kb_query` to find existing fact IDs before creating new ones",
    "2. `kb_upsert` for the req entity and include `relationships` with `constrains` and `requires_property`",
    "3. Reuse the same constrained fact ID across related requirements; vary property facts only when semantics differ",
    '4. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }`',
    "",
    "## Discover requirement coverage gaps",
    '1. `kb_query` with `{ "type": "req", "limit": 20 }`',
    '2. `kb_coverage_report` with `{ "type": "req" }`',
    '3. `kb_derive` with `{ "rule": "coverage_gap" }`',
    "",
    "## Add a requirement and link it to a test",
    "1. `kb_query` for existing IDs to avoid collisions",
    "2. `kb_upsert` with entity payload and `relationships` containing `verified_by`",
    '3. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }`',
    "",
    "## Safe cleanup of stale branch KBs",
    '1. `kb_branch_gc` with `{ "dry_run": true }`',
    "2. Review `structuredContent.stale`",
    '3. `kb_branch_gc` with `{ "dry_run": false }` only when deletion is intended',
  ].join("\n");

  return [
    {
      uri: "kibi://docs/overview",
      name: "kibi docs overview",
      description: "Full server description, purpose, and scope.",
      mimeType: "text/markdown",
      text: overview,
    },
    {
      uri: "kibi://docs/tools",
      name: "kibi docs tools",
      description: "Available tools with summaries and required parameters.",
      mimeType: "text/markdown",
      text: renderToolsDoc(),
    },
    {
      uri: "kibi://docs/errors",
      name: "kibi docs errors",
      description: "Common error modes and suggested recovery actions.",
      mimeType: "text/markdown",
      text: errors,
    },
    {
      uri: "kibi://docs/examples",
      name: "kibi docs examples",
      description: "Concrete tool call sequences for common tasks.",
      mimeType: "text/markdown",
      text: examples,
    },
  ];
}

const DOC_RESOURCES = registerDocResources();

function getHelpText(topic?: string): string {
  const normalized = (topic ?? "overview").trim().toLowerCase();

  if (normalized === "tools") {
    return renderToolsDoc();
  }

  if (normalized === "workflow") {
    return PROMPTS.find((p) => p.name === "kibi_workflow")?.text ?? "";
  }

  if (normalized === "constraints") {
    return PROMPTS.find((p) => p.name === "kibi_constraints")?.text ?? "";
  }

  if (normalized === "examples") {
    return (
      DOC_RESOURCES.find((r) => r.uri === "kibi://docs/examples")?.text ?? ""
    );
  }

  if (normalized === "errors") {
    return (
      DOC_RESOURCES.find((r) => r.uri === "kibi://docs/errors")?.text ?? ""
    );
  }

  if (normalized === "branching") {
    return [
      "# Branch Selection",
      "",
      "Kibi is branch-aware. By default, the MCP server detects the current git branch and attaches to the corresponding KB in `.kb/branches/<branch>`.",
      "",
      "## Forcing a Branch",
      "You can override the detected branch by setting the `KIBI_BRANCH` environment variable before starting the server.",
      "",
      "Example:",
      "```bash",
      "KIBI_BRANCH=feature/auth bun run packages/mcp/src/server.ts",
      "```",
      "",
      "## How it works",
      "1. If `KIBI_BRANCH` is set, it uses that value.",
      "2. If not set, it runs `git branch --show-current`.",
      "3. If git detection fails, it falls back to `develop`.",
      "4. The server logs the selection process to stderr on startup.",
    ].join("\n");
  }

  return (
    DOC_RESOURCES.find((r) => r.uri === "kibi://docs/overview")?.text ?? ""
  );
}

let prologProcess: PrologProcess | null = null;
let isInitialized = false;
let activeBranchName = "develop";
// Shutdown tracking state
let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;
const inFlightRequests = new Map<string, Promise<unknown>>();

function debugLog(...args: Parameters<typeof console.error>): void {
  if (process.env.KIBI_MCP_DEBUG) {
    console.error(...args);
  }
}

async function initiateGracefulShutdown(exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  debugLog(`[KIBI-MCP] Initiating graceful shutdown (exit code: ${exitCode})`);

  // Wait for in-flight requests
  if (inFlightRequests.size > 0) {
    debugLog(
      `[KIBI-MCP] Waiting for ${inFlightRequests.size} in-flight requests to complete...`,
    );

    const timeoutPromise = new Promise((_, reject) => {
      shutdownTimeout = setTimeout(() => {
        reject(new Error("Shutdown timeout"));
      }, 10000); // 10 second timeout
    });

    try {
      await Promise.race([
        Promise.allSettled(Array.from(inFlightRequests.values())),
        timeoutPromise,
      ]);
      debugLog("[KIBI-MCP] All in-flight requests completed");
    } catch (_error) {
      console.error("[KIBI-MCP] Shutdown timeout reached, forcing exit");
    } finally {
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }
    }
  }

  // Cleanup Prolog process
  if (prologProcess?.isRunning()) {
    debugLog("[KIBI-MCP] Terminating Prolog process...");
    try {
      await prologProcess.terminate();
      debugLog("[KIBI-MCP] Prolog process terminated");
    } catch (error) {
      console.error("[KIBI-MCP] Error terminating Prolog:", error);
    }
  }

  // Exit
  process.exit(exitCode);
}

async function ensureProlog(): Promise<PrologProcess> {
  if (isInitialized && prologProcess?.isRunning()) {
    return prologProcess;
  }

  debugLog("[KIBI-MCP] Initializing Prolog process...");

  prologProcess = new PrologProcess({ timeout: 30000 });
  await prologProcess.start();

  const workspaceRoot = resolveWorkspaceRoot();
  let branch = process.env.KIBI_BRANCH || "develop";
  let gitBranch: string | undefined;

  if (!process.env.KIBI_BRANCH) {
    try {
      const { execSync } = await import("node:child_process");
      const detected = execSync("git branch --show-current", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      if (detected) {
        gitBranch = detected === "master" ? "develop" : detected;
        branch = gitBranch;
      }
    } catch {
      // fall back to develop
    }
  }

  debugLog("[KIBI-MCP] Branch selection:");
  debugLog(
    `[KIBI-MCP]   KIBI_BRANCH env: ${process.env.KIBI_BRANCH || "not set"}`,
  );
  debugLog(`[KIBI-MCP]   Git branch: ${gitBranch || "n/a"}`);
  debugLog(`[KIBI-MCP]   Attached to: ${branch}`);
  debugLog("[KIBI-MCP] To change branch: set KIBI_BRANCH=<branch> and restart");

  activeBranchName = branch;
  const kbPath = resolveKbPath(workspaceRoot, branch);
  const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);

  if (!attachResult.success) {
    throw new Error(
      `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
    );
  }

  isInitialized = true;
  debugLog(
    `[KIBI-MCP] Prolog process started (PID: ${prologProcess.getPid()})`,
  );
  debugLog(`[KIBI-MCP] KB attached: ${kbPath}`);
  return prologProcess;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

type ToolHandlerArgs = Record<string, unknown> & {
  _requestId?: string;
};

type JsonPrimitive = string | number | boolean | null;

function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  const obj = schema as Record<string, unknown>;

  if (Array.isArray(obj.enum) && obj.enum.length > 0) {
    const description =
      typeof obj.description === "string" ? obj.description : undefined;
    const literals = obj.enum.filter(
      (value): value is JsonPrimitive =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null,
    );
    if (literals.length === 0) {
      return description ? z.any().describe(description) : z.any();
    }
    const literalSchemas = literals.map((value) => z.literal(value));
    if (literalSchemas.length === 1) {
      const single = literalSchemas[0];
      return description ? single.describe(description) : single;
    }
    const union = z.union(
      literalSchemas as [
        z.ZodLiteral<JsonPrimitive>,
        ...z.ZodLiteral<JsonPrimitive>[],
      ],
    );
    return description ? union.describe(description) : union;
  }

  const schemaType = typeof obj.type === "string" ? obj.type : undefined;

  switch (schemaType) {
    case "object": {
      const properties =
        obj.properties && typeof obj.properties === "object"
          ? (obj.properties as Record<string, unknown>)
          : {};
      const required = new Set(
        Array.isArray(obj.required)
          ? obj.required.filter(
              (k): k is string => typeof k === "string" && k.length > 0,
            )
          : [],
      );

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(properties)) {
        const propSchema = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? propSchema : propSchema.optional();
      }

      let objectSchema = z.object(shape);
      if (obj.additionalProperties !== false) {
        objectSchema = objectSchema.passthrough();
      }
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? objectSchema.describe(description) : objectSchema;
    }
    case "array": {
      const itemSchema = jsonSchemaToZod(obj.items);
      let arraySchema = z.array(itemSchema);
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minItems === "number") {
        arraySchema = arraySchema.min(obj.minItems);
      }
      if (typeof obj.maxItems === "number") {
        arraySchema = arraySchema.max(obj.maxItems);
      }
      return description ? arraySchema.describe(description) : arraySchema;
    }
    case "string": {
      let s = z.string();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minLength === "number") {
        s = s.min(obj.minLength);
      }
      if (typeof obj.maxLength === "number") {
        s = s.max(obj.maxLength);
      }
      return description ? s.describe(description) : s;
    }
    case "number": {
      let n = z.number();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "integer": {
      let n = z.number().int();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "boolean": {
      const b = z.boolean();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? b.describe(description) : b;
    }
    default: {
      const anySchema = z.any();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? anySchema.describe(description) : anySchema;
    }
  }
}

function addTool(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
): void {
  const wrappedHandler: ToolHandler = async (args) => {
    try {
      // Validate that args is a valid object
      if (typeof args !== "object" || args === null) {
        throw new Error(
          `Invalid arguments for tool ${name}: expected object, got ${typeof args}`,
        );
      }

      // Check if shutting down before processing
      if (isShuttingDown) {
        throw new Error(`Tool ${name} rejected: server is shutting down`);
      }

      // Extract or generate requestId from args
      const requestIdArg = (args as ToolHandlerArgs)._requestId;
      const requestId =
        typeof requestIdArg === "string"
          ? requestIdArg
          : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log tool call for debugging (to stderr to avoid breaking stdio protocol)
      if (process.env.KIBI_MCP_DEBUG) {
        console.error(
          `[KIBI-MCP] Tool called: ${name} (requestId: ${requestId}) with args:`,
          JSON.stringify(args),
        );
      }

      // Track the handler promise in inFlightRequests Map
      const handlerPromise = handler(args);
      inFlightRequests.set(requestId, handlerPromise);

      try {
        // Execute handler
        const result = await handlerPromise;
        return result;
      } finally {
        // Always clean up from Map when done (success or failure)
        inFlightRequests.delete(requestId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[KIBI-MCP] Error in tool ${name}:`, err.message);
      if (err.stack) {
        debugLog(`[KIBI-MCP] Tool ${name} stack:`, err.stack);
      }
      throw new Error(`Tool ${name} failed: ${err.message}`, { cause: err });
    }
  };

  (
    server as McpServer & {
      registerTool: (
        n: string,
        c: { description: string; inputSchema: z.ZodTypeAny },
        h: ToolHandler,
      ) => void;
    }
  ).registerTool(
    name,
    { description, inputSchema: jsonSchemaToZod(inputSchema) },
    wrappedHandler,
  );
}

export async function startServer(): Promise<void> {
  const server = new McpServer({ name: "kibi-mcp", version: "0.1.0" });

  attachMcpcat(server);

  for (const prompt of PROMPTS) {
    server.prompt(prompt.name, prompt.description, async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: prompt.text },
        },
      ],
    }));
  }

  for (const resource of DOC_RESOURCES) {
    server.resource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      }),
    );
  }

  const toolDef = (name: string) => {
    const t = TOOLS.find((t) => t.name === name);
    if (!t) throw new Error(`Unknown tool: ${name}`);
    return t;
  };

  addTool(
    server,
    "kb_query",
    toolDef("kb_query").description,
    toolDef("kb_query").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbQuery(prolog, args as QueryArgs);
    },
  );

  addTool(
    server,
    "kb_upsert",
    toolDef("kb_upsert").description,
    toolDef("kb_upsert").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbUpsert(prolog, args as unknown as UpsertArgs);
    },
  );

  addTool(
    server,
    "kb_delete",
    toolDef("kb_delete").description,
    toolDef("kb_delete").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbDelete(prolog, args as unknown as DeleteArgs);
    },
  );

  addTool(
    server,
    "kb_check",
    toolDef("kb_check").description,
    toolDef("kb_check").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbCheck(prolog, args as CheckArgs);
    },
  );

  addTool(
    server,
    "kb_branch_ensure",
    toolDef("kb_branch_ensure").description,
    toolDef("kb_branch_ensure").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbBranchEnsure(prolog, args as unknown as BranchEnsureArgs);
    },
  );

  addTool(
    server,
    "kb_branch_gc",
    toolDef("kb_branch_gc").description,
    toolDef("kb_branch_gc").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbBranchGc(prolog, args as BranchGcArgs);
    },
  );

  addTool(
    server,
    "kb_query_relationships",
    toolDef("kb_query_relationships").description,
    toolDef("kb_query_relationships").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbQueryRelationships(prolog, args as QueryRelationshipsArgs);
    },
  );

  addTool(
    server,
    "kb_derive",
    toolDef("kb_derive").description,
    toolDef("kb_derive").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbDerive(prolog, args as unknown as DeriveArgs);
    },
  );

  addTool(
    server,
    "kb_impact",
    toolDef("kb_impact").description,
    toolDef("kb_impact").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbImpact(prolog, args as unknown as ImpactArgs);
    },
  );

  addTool(
    server,
    "kb_coverage_report",
    toolDef("kb_coverage_report").description,
    toolDef("kb_coverage_report").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbCoverageReport(prolog, args as CoverageReportArgs);
    },
  );

  addTool(
    server,
    "kb_symbols_refresh",
    toolDef("kb_symbols_refresh").description,
    toolDef("kb_symbols_refresh").inputSchema,
    async (args) => handleKbSymbolsRefresh(args as SymbolsRefreshArgs),
  );

  addTool(
    server,
    "kb_list_entity_types",
    toolDef("kb_list_entity_types").description,
    toolDef("kb_list_entity_types").inputSchema,
    handleKbListEntityTypes,
  );

  addTool(
    server,
    "kb_list_relationship_types",
    toolDef("kb_list_relationship_types").description,
    toolDef("kb_list_relationship_types").inputSchema,
    handleKbListRelationshipTypes,
  );

  addTool(
    server,
    "kbcontext",
    toolDef("kbcontext").description,
    toolDef("kbcontext").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbContext(
        prolog,
        args as unknown as ContextArgs,
        activeBranchName,
      );
    },
  );

  addTool(
    server,
    "get_help",
    toolDef("get_help").description,
    toolDef("get_help").inputSchema,
    async (args) => {
      const topic = typeof args?.topic === "string" ? args.topic : undefined;
      const text = getHelpText(topic);
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { topic: topic ?? "overview" },
      };
    },
  );

  const transport = new StdioServerTransport();

  transport.onerror = (error: Error) => {
    // Stdio transport surfaces JSON parse / schema validation failures via onerror.
    // Those errors should not crash the server: emit a JSON-RPC error (id omitted)
    // and continue reading subsequent messages.
    if (error.name === "SyntaxError") {
      debugLog("[KIBI-MCP] Parse error from stdin:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send parse error response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    if (error.name === "ZodError") {
      debugLog("[KIBI-MCP] Invalid JSON-RPC message:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send invalid request response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    console.error(`[KIBI-MCP] Transport error: ${error.message}`, error);
    debugLog("[KIBI-MCP] Transport error stack:", error.stack);
    initiateGracefulShutdown(1);
  };

  transport.onclose = () => {
    debugLog("[KIBI-MCP] Transport closed");
    initiateGracefulShutdown(0);
  };

  await server.connect(transport);

  process.stdout.on("error", (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[KIBI-MCP] stdout error:", message);
    debugLog("[KIBI-MCP] stdout error detail:", error as Error);
    initiateGracefulShutdown(1);
  });

  process.stderr.on("error", (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    try {
      console.error("[KIBI-MCP] stderr error:", message);
    } catch {}
    initiateGracefulShutdown(1);
  });

  process.on("SIGTERM", () => {
    debugLog("[KIBI-MCP] Received SIGTERM");
    initiateGracefulShutdown(0);
  });

  process.on("SIGINT", () => {
    debugLog("[KIBI-MCP] Received SIGINT");
    initiateGracefulShutdown(0);
  });

  // Handle stdin EOF/close for clean shutdown when client disconnects
  // Use debugLog so these are only noisy when KIBI_MCP_DEBUG is set.
  try {
    process.stdin.on("end", () => {
      debugLog("[KIBI-MCP] stdin ended");
      // fire-and-forget; initiateGracefulShutdown is idempotent
      void initiateGracefulShutdown(0);
    });

    process.stdin.on("close", () => {
      debugLog("[KIBI-MCP] stdin closed");
      void initiateGracefulShutdown(0);
    });
  } catch (e) {
    // Defensive: do not let stdin handler setup throw during startup
    debugLog("[KIBI-MCP] Failed to attach stdin handlers:", e as Error);
  }
}
````

## File: packages/mcp/src/tools-config.ts
````typescript
export const TOOLS = [
  {
    name: "kb_query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Optional entity type filter. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Optional exact entity ID. Example: 'REQ-001'. If omitted, returns matching entities by other filters.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tag filter. Matches entities that contain any provided tag. Example: ['security','billing'].",
        },
        sourceFile: {
          type: "string",
          description:
            "Optional source-file substring filter. Example: 'src/auth/login.ts'. Uses KB source linkage, not file-system scanning.",
        },
        limit: {
          type: "number",
          default: 100,
          description:
            "Optional max rows to return after filtering. Default: 100 when omitted. Example: 25.",
        },
        offset: {
          type: "number",
          default: 0,
          description:
            "Optional zero-based pagination offset. Default: 0. Example: 50 to skip first 50 rows.",
        },
      },
    },
  },
  {
    name: "kb_upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`) so consistency and contradiction checks remain queryable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
    inputSchema: {
      type: "object",
      required: ["type", "id", "properties"],
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Entity type to create/update. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Unique entity ID (string). Example: 'REQ-123'. Existing ID updates the entity; new ID creates it.",
        },
        properties: {
          type: "object",
          description:
            "Entity fields to persist. Must include title and status. If created_at, updated_at, or source are omitted, server fills defaults.",
          properties: {
            title: {
              type: "string",
              description:
                "Required short title. Example: 'Protect account settings endpoint'.",
            },
            status: {
              type: "string",
              enum: [
                "active",
                "draft",
                "archived",
                "deleted",
                "approved",
                "rejected",
                "pending",
                "in_progress",
                "superseded",
              ],
              description:
                "Required lifecycle state. Allowed values are fixed enum options. Example: 'active'.",
            },
            source: {
              type: "string",
              description:
                "Optional provenance string. Example: 'docs/requirements/REQ-123.md'. Defaults to 'mcp://kibi/upsert'.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional categorization tags. Example: ['security','api'].",
            },
            owner: {
              type: "string",
              description:
                "Optional owner name/team. Example: 'platform-team'.",
            },
            priority: {
              type: "string",
              description: "Optional priority label. Example: 'high'.",
            },
            severity: {
              type: "string",
              description: "Optional severity label. Example: 'critical'.",
            },
            links: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional references. Example: ['REQ-010','https://example.com/spec'].",
            },
            text_ref: {
              type: "string",
              description:
                "Optional text anchor/reference. Example: 'requirements.md#L40'.",
            },
          },
          required: ["title", "status"],
        },
        relationships: {
          type: "array",
          description:
            "Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` edges from req IDs to shared fact IDs to maximize reuse and detect conflicts. Side effect: asserts edges in KB.",
          items: {
            type: "object",
            required: ["type", "from", "to"],
            properties: {
              type: {
                type: "string",
                enum: [
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
                  "relates_to",
                ],
                description:
                  "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req->test).",
              },
              from: {
                type: "string",
                description:
                  "Source entity ID (must exist). Example: 'SYM-login-handler'.",
              },
              to: {
                type: "string",
                description:
                  "Target entity ID (must exist). Example: 'REQ-001'.",
              },
            },
          },
        },
      },
    },
  },
  {
    name: "kb_delete",
    description:
      "Delete entities by ID. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. Side effects: mutates and saves KB; skips entities with dependents.",
    inputSchema: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Required list of entity IDs to delete. Example: ['REQ-001','TEST-002']. At least one ID is required.",
        },
      },
    },
  },
  {
    name: "kb_check",
    description:
      "Run KB validation rules and return violations. Use before or after mutations. Do not use for point lookups. No write side effects.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional rule subset. Allowed: must-priority-coverage, no-dangling-refs, no-cycles, required-fields. If omitted, server runs all.",
        },
      },
    },
  },
  {
    name: "kb_branch_ensure",
    description:
      "Ensure a branch KB exists, creating it from develop when missing. Use when targeting non-develop branches. Do not use to switch git branches. Side effects: creates .kb/branches/<branch>.",
    inputSchema: {
      type: "object",
      required: ["branch"],
      properties: {
        branch: {
          type: "string",
          description:
            "Required git branch name. Example: 'feature/auth-hardening'. Path traversal patterns are rejected.",
        },
      },
    },
  },
  {
    name: "kb_branch_gc",
    description:
      "Find or delete stale branch KB directories not present in git. Use for repository hygiene. Do not use if you need historical branch KBs. Side effects: can delete branch KB folders when dry_run is false.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: {
          type: "boolean",
          default: true,
          description:
            "Optional safety flag. true = report only; false = delete stale branch KBs. Default: true.",
        },
      },
    },
  },
  {
    name: "kb_query_relationships",
    description:
      "Read relationship edges with optional from/to/type filters. Use for traceability traversal. Do not use to create links. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Optional source entity ID filter. Example: 'REQ-001'.",
        },
        to: {
          type: "string",
          description: "Optional target entity ID filter. Example: 'TEST-010'.",
        },
        type: {
          type: "string",
          enum: [
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
            "relates_to",
          ],
          description:
            "Optional relationship type filter. Allowed enum values only. Example: 'implements'.",
        },
      },
    },
  },
  {
    name: "kb_derive",
    description:
      "Run deterministic inference predicates and return rows. Use for impact, coverage, and consistency analysis. Do not use for entity CRUD. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["rule"],
      properties: {
        rule: {
          type: "string",
          enum: [
            "transitively_implements",
            "transitively_depends",
            "impacted_by_change",
            "affected_symbols",
            "coverage_gap",
            "untested_symbols",
            "stale",
            "orphaned",
            "conflicting",
            "deprecated_still_used",
            "current_adr",
            "adr_chain",
            "superseded_by",
            "domain_contradictions",
          ],
          description:
            "Required inference rule name. Allowed values are the enum options. Example: 'coverage_gap'.",
        },
        params: {
          type: "object",
          description:
            "Optional rule-specific parameters. Example: { changed: 'REQ-001' } for impacted_by_change.",
        },
      },
    },
  },
  {
    name: "kb_impact",
    description:
      "Return entities impacted by a changed entity ID. Use for quick change blast radius checks. Do not use for general querying. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["entity"],
      properties: {
        entity: {
          type: "string",
          description: "Required changed entity ID. Example: 'REQ-001'.",
        },
      },
    },
  },
  {
    name: "kb_coverage_report",
    description:
      "Compute aggregate traceability coverage for requirements and/or symbols. Use for health snapshots. Do not use for raw entity dumps. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["req", "symbol"],
          description:
            "Optional focus scope: 'req' or 'symbol'. Omit to include both.",
        },
      },
    },
  },
  {
    name: "kb_symbols_refresh",
    description:
      "Refresh generated symbol coordinates in the symbols manifest. Use after refactors that move symbols. Do not use for semantic edits. Side effects: may rewrite symbols.yaml unless dryRun is true.",
    inputSchema: {
      type: "object",
      properties: {
        dryRun: {
          type: "boolean",
          default: false,
          description:
            "Optional preview mode. true = report only, false = apply file updates. Default: false.",
        },
      },
    },
  },
  {
    name: "kb_list_entity_types",
    description:
      "List supported entity type names. Use when building valid tool arguments. Do not use for entity data retrieval. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kb_list_relationship_types",
    description:
      "List supported relationship type names. Use before asserting or filtering relationships. Do not use for graph traversal. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kbcontext",
    description:
      "Return KB entities linked to a source file plus first-hop relationships. Use for file-centric traceability. Do not use for cross-repo search. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["sourceFile"],
      properties: {
        sourceFile: {
          type: "string",
          description:
            "Required source path substring. Example: 'src/auth/login.ts'.",
        },
        branch: {
          type: "string",
          description:
            "Optional branch hint for clients. Must match the server's active branch or will return an error.",
        },
      },
    },
  },
  {
    name: "get_help",
    description:
      "Returns documentation for this MCP server. Call this first if you are unsure how to proceed or which tool to use. Available topics: overview, tools, workflow, constraints, examples, errors.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "overview",
            "tools",
            "workflow",
            "constraints",
            "examples",
            "errors",
            "branching",
          ],
          description:
            "Optional documentation section. Omit to return overview. Example: 'workflow'.",
        },
      },
    },
  },
];
````

## File: packages/mcp/package.json
````json
{
  "name": "@kibi/mcp",
  "version": "0.1.0",
  "type": "module",
  "description": "Model Context Protocol server for Kibi knowledge base",
  "main": "./src/server.js",
  "bin": {
    "kibi-mcp": "./bin/kibi-mcp"
  },
  "scripts": {
    "test": "bun test",
    "dev": "bun run bin/kibi-mcp"
  },
  "dependencies": {
    "@kibi/cli": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.26.0",
    "ajv": "^8.18.0",
    "js-yaml": "^4.1.0",
    "mcpcat": "^0.1.12",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "latest"
  }
}
````


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-2.md](file:kibi-01-logic-2.md)

#### ⏭️ NEXT PART: [kibi-01-logic-4.md](file:kibi-01-logic-4.md)

> _End of Part 4_
