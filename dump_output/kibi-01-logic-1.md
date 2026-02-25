# Pack: kibi-01-logic (Part 1)


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
    bin/
      kibi
    src/
      commands/
        branch.ts
        check.ts
        check.ts.backup
        check.ts.head
        check.ts.tail
        check.ts.tmp
        doctor.ts
        gc.ts
        init-helpers.ts
        init.ts
        query.ts
        sync.ts
      cli.ts
    package.json
```

# Files

## File: packages/cli/bin/kibi
```
#!/usr/bin/env bun
import "../src/cli.ts";
```

## File: packages/cli/src/commands/branch.ts
```typescript
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function branchEnsureCommand(): Promise<void> {
  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  const kbPath = path.join(process.cwd(), ".kb/branches", branch);
  const mainPath = path.join(process.cwd(), ".kb/branches/main");

  if (!fs.existsSync(mainPath)) {
    console.warn(
      "Warning: main branch KB does not exist, skipping branch ensure",
    );
    return;
  }

  if (!fs.existsSync(kbPath)) {
    fs.cpSync(mainPath, kbPath, { recursive: true });
    console.log(`Created branch KB: ${branch}`);
  } else {
    console.log(`Branch KB already exists: ${branch}`);
  }
}

export default branchEnsureCommand;
```

## File: packages/cli/src/commands/check.ts
```typescript
import * as path from "node:path";
import { PrologProcess } from "../prolog.js";
export interface CheckOptions {
  fix?: boolean;
}

export interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), ".kb/branches/main");
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(`Error: Failed to attach KB: ${attachResult.error}`);
      process.exit(1);
    }

    const violations: Violation[] = [];

    const allEntityIds = await getAllEntityIds(prolog);

    violations.push(...(await checkMustPriorityCoverage(prolog)));
    violations.push(...(await checkNoDanglingRefs(prolog)));
    violations.push(...(await checkNoCycles(prolog)));
    violations.push(...(await checkRequiredFields(prolog, allEntityIds)));
    violations.push(...(await checkDeprecatedAdrs(prolog)));
    violations.push(...(await checkDomainContradictions(prolog)));

    await prolog.query("kb_detach");
    await prolog.terminate();

    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      process.exit(0);
    }

    console.log(`Found ${violations.length} violation(s):`);
    console.log();

    for (const v of violations) {
      const filename = v.source ? path.basename(v.source, ".md") : v.entityId;
      console.log(`[${v.rule}] ${filename}`);
      console.log(`  ${v.description}`);
      if (options.fix && v.suggestion) {
        console.log(`  Suggestion: ${v.suggestion}`);
      }
      console.log();
    }

    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Find all must-priority requirements
  const mustReqs = await findMustPriorityReqs(prolog);

  for (const reqId of mustReqs) {
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

    const scenarioResult = await prolog.query(
      `kb_relationship(specified_by, '${reqId}', ScenarioId)`,
    );

    const hasScenario = scenarioResult.success;

    const testResult = await prolog.query(
      `kb_relationship(validates, TestId, '${reqId}')`,
    );

    const hasTest = testResult.success;

    if (!hasScenario || !hasTest) {
      let desc = "Must-priority requirement lacks ";
      const missing: string[] = [];
      if (!hasScenario) missing.push("scenario");
      if (!hasTest) missing.push("test");
      desc = `${desc}${missing.join(" and ")} coverage`;

      violations.push({
        rule: "must-priority-coverage",
        entityId: reqId,
        description: desc,
        source,
        suggestion: missing
          .map((m) => `Create ${m} that covers this requirement`)
          .join("; "),
      });
    }
  }

  return violations;
}

async function findMustPriorityReqs(prolog: PrologProcess): Promise<string[]> {
  const query = `findall(Id, (kb_entity(Id, req, Props), memberchk(priority=P, Props), (P = ^^("must", _) ; P = "must" ; P = 'must' ; (atom(P), atom_string(P, PS), sub_string(PS, _, 4, 0, "must")))), Ids)`;
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
    "constrains",
    "requires_property",
    "supersedes",
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
            "Break cycle by removing one of the depends_on relationships",
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

async function checkDeprecatedAdrs(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Use Prolog predicate to find deprecated ADRs without successors
  const result = await prolog.query(
    "setof(Id, deprecated_no_successor(Id), Ids)",
  );

  if (!result.success || !result.bindings.Ids) {
    return violations;
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  const adrIds = content
    .split(",")
    .map((id) => id.trim().replace(/^'|'$/g, ""));

  for (const adrId of adrIds) {
    // Get source for better error message
    const entityResult = await prolog.query(
      `kb_entity('${adrId}', adr, Props)`,
    );
    let source = "";
    if (entityResult.success && entityResult.bindings.Props) {
      const propsStr = entityResult.bindings.Props;
      const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
      if (sourceMatch) {
        source = sourceMatch[1];
      }
    }

    violations.push({
      rule: "deprecated-adr-no-successor",
      entityId: adrId,
      description:
        "Archived/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
      suggestion: `Create a new ADR and add: links: [{type: supersedes, target: ${adrId}}]`,
      source,
    });
  }

  return violations;
}

async function checkDomainContradictions(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query(
    "setof([A,B,Reason], contradicting_reqs(A, B, Reason), Rows)",
  );

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = parseTripleRows(result.bindings.Rows);

  for (const [reqA, reqB, reason] of rows) {
    violations.push({
      rule: "domain-contradictions",
      entityId: `${reqA}/${reqB}`,
      description: reason,
      suggestion:
        "Supersede one requirement or align both to the same required property",
    });
  }

  return violations;
}

function parseTripleRows(raw: string): Array<[string, string, string]> {
  const cleaned = raw.trim();
  if (cleaned === "[]" || cleaned.length === 0) {
    return [];
  }

  const rows: Array<[string, string, string]> = [];
  const rowRegex = /\[([^,]+),([^,]+),([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  do {
    match = rowRegex.exec(cleaned);
    if (match) {
      rows.push([
        match[1].trim().replace(/^'|'$/g, ""),
        match[2].trim().replace(/^'|'$/g, ""),
        match[3].trim().replace(/^'|'$/g, ""),
      ]);
    }
  } while (match);
  return rows;
}
```

## File: packages/cli/src/commands/check.ts.backup
```
import * as path from "node:path";
import { PrologProcess } from "../prolog.js";

export interface CheckOptions {
  fix?: boolean;
}

interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), ".kb/branches/main");
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(`Error: Failed to attach KB: ${attachResult.error}`);
      process.exit(1);
    }

    const violations: Violation[] = [];

    const allEntityIds = await getAllEntityIds(prolog);

    violations.push(...(await checkMustPriorityCoverage(prolog)));

    violations.push(...(await checkNoDanglingRefs(prolog)));

    violations.push(...(await checkNoCycles(prolog)));

    violations.push(...(await checkRequiredFields(prolog, allEntityIds)));

    violations.push(...(await checkDeprecatedAdrs(prolog)));

    violations.push(...(await checkDomainContradictions(prolog)));

    await prolog.query("kb_detach");
    await prolog.terminate();

    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      process.exit(0);
    }

    console.log(`Found ${violations.length} violation(s):
`);

    for (const v of violations) {
      const filename = v.source ? path.basename(v.source, ".md") : v.entityId;
      console.log(`[${v.rule}] ${filename}`);
      console.log(`  ${v.description}`);
      if (options.fix && v.suggestion) {
        console.log(`  Suggestion: ${v.suggestion}`);
      }
      console.log();
    }

    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Find all must-priority requirements
  const mustReqs = await findMustPriorityReqs(prolog);
  console.log('Found must-priority reqs:', mustReqs);


  for (const reqId of mustReqs) {
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

    const scenarioResult = await prolog.query(
      `kb_relationship(specified_by, '${reqId}', ScenarioId)`,
    );

    const hasScenario = scenarioResult.success;
  console.log('Scenario query success for reqId', reqId, ':', scenarioResult.success);


    const testResult = await prolog.query(
      `kb_relationship(validates, TestId, '${reqId}')`,
    );

    const hasTest = testResult.success;
  console.log('Test query success for reqId', reqId, ':', testResult.success);


    if (!hasScenario || !hasTest) {
      let desc = "Must-priority requirement lacks ";
      const missing: string[] = [];
      if (!hasScenario) missing.push("scenario");
      if (!hasTest) missing.push("test");
      desc = `${desc}${missing.join(" and ")} coverage`;

      violations.push({
        rule: "must-priority-coverage",
        entityId: reqId,
        description: desc,
        source,
        suggestion: missing
          .map((m) => `Create ${m} that covers this requirement`)
          .join("; "),
      });
    }
  }

  return violations;
}

async function findMustPriorityReqs(prolog: PrologProcess): Promise<string[]> {
  const query = `findall(Id, (kb_entity(Id, req, Props), memberchk(priority=P, Props), atom_string(P, PS), sub_string(PS, _, 4, 0, "must")), Ids)`;

  const result = await prolog.query(query);
  console.log('Success:', result.success);
  if (result.success && result.bindings) console.log('Ids:', result.bindings.Ids);

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
    "constrains",
    "requires_property",
    "supersedes",
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

async function checkDeprecatedAdrs(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Use Prolog predicate to find deprecated ADRs without successors
  const result = await prolog.query(
    "setof(Id, deprecated_no_successor(Id), Ids)",
  );

  if (!result.success || !result.bindings.Ids) {
    return violations;
  }

  const idsStr = result.bindings.Ids;
  const match = idsStr.match(/\[(.*)\]/);
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  const adrIds = content
    .split(",")
    .map((id) => id.trim().replace(/^'|'$/g, ""));

  for (const adrId of adrIds) {
    // Get source for better error message
    const entityResult = await prolog.query(
      `kb_entity('${adrId}', adr, Props)`,
    );

    let source = "";
    if (entityResult.success && entityResult.bindings.Props) {
      const propsStr = entityResult.bindings.Props;
      const sourceMatch = propsStr.match(/source\s*=\s*\^\^?\("([^"]+)"/);
      if (sourceMatch) {
        source = sourceMatch[1];
      }
    }

    violations.push({
      rule: "deprecated-adr-no-successor",
      entityId: adrId,
      description:
        "Archived/deprecated ADR has no successor — add a supersedes link from the replacement ADR",
      suggestion: `Create a new ADR and add: links: [{type: supersedes, target: ${adrId}}]`,
      source,
    });
  }

  return violations;
}

async function checkDomainContradictions(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const result = await prolog.query(
    "setof([A,B,Reason], contradicting_reqs(A, B, Reason), Rows)",
  );

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = parseTripleRows(result.bindings.Rows);
  for (const [reqA, reqB, reason] of rows) {
    violations.push({
      rule: "domain-contradictions",
      entityId: `${reqA}/${reqB}`,
      description: reason,
      suggestion:
        "Supersede one requirement or align both to the same required property",
    });
  }

  return violations;
}

function parseTripleRows(raw: string): Array<[string, string, string]> {
  const cleaned = raw.trim();
  if (cleaned === "[]" || cleaned.length === 0) {
    return [];
  }

  const rows: Array<[string, string, string]> = [];
  const rowRegex = /\[([^,]+),([^,]+),([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  do {
    match = rowRegex.exec(cleaned);
    if (match) {
      rows.push([
        match[1].trim().replace(/^'|'$/g, ""),
        match[2].trim().replace(/^'|'$/g, ""),
        match[3].trim().replace(/^'|'$/g, ""),
      ]);
    }
  } while (match);

  return rows;
}
```

## File: packages/cli/src/commands/check.ts.head
```
import * as path from "node:path";
import { PrologProcess } from "../prolog.js";

export interface CheckOptions {
  fix?: boolean;
}

interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), ".kb/branches/main");
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(`Error: Failed to attach KB: ${attachResult.error}`);
      process.exit(1);
    }

    const violations: Violation[] = [];

    const allEntityIds = await getAllEntityIds(prolog);

    violations.push(...(await checkMustPriorityCoverage(prolog)));

    violations.push(...(await checkNoDanglingRefs(prolog)));

    violations.push(...(await checkNoCycles(prolog)));

    violations.push(...(await checkRequiredFields(prolog, allEntityIds)));

    violations.push(...(await checkDeprecatedAdrs(prolog)));

    violations.push(...(await checkDomainContradictions(prolog)));

    await prolog.query("kb_detach");
    await prolog.terminate();

    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      process.exit(0);
    }

    console.log(`Found ${violations.length} violation(s):
`);

    for (const v of violations) {
      const filename = v.source ? path.basename(v.source, ".md") : v.entityId;
      console.log(`[${v.rule}] ${filename}`);
      console.log(`  ${v.description}`);
      if (options.fix && v.suggestion) {
        console.log(`  Suggestion: ${v.suggestion}`);
      }
      console.log();
    }

    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
```

## File: packages/cli/src/commands/check.ts.tail
```
async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Use Prolog predicate to find coverage gaps
  const result = await prolog.query("setof([Req, Reason], coverage_gap(Req, Reason), Rows)");

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = result.bindings.Rows;
  const match = rows.match(/\[(.*)\]/);
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  // Parse the results from Rows
  const rowMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);
  for (const rowMatch of rowMatches) {
    const reqId = rowMatch[1].trim().replace(/^'|'$/g, "");
    const reason = rowMatch[2].trim().replace(/^'|'$/g, "");

    // Get source for better error messages
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

    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${reason}`,
      source,
      suggestion: `Create ${reason} that covers this requirement`,
    });
  }

  return violations;
}
```

## File: packages/cli/src/commands/check.ts.tmp
```
async function checkMustPriorityCoverage(
  prolog: PrologProcess,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Use Prolog predicate to find coverage gaps
  const result = await prolog.query("setof([Req, Reason], coverage_gap(Req, Reason), Rows)");

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = result.bindings.Rows;
  const match = rows.match(/\[(.*)\]/);
  if (!match) {
    return violations;
  }

  const content = match[1].trim();
  if (!content) {
    return violations;
  }

  // Parse the results from Rows
  const rowMatches = content.matchAll(/\[([^,]+),([^\]]+)\]/g);
  for (const rowMatch of rowMatches) {
    const reqId = rowMatch[1].trim().replace(/^'|'$/g, "");
    const reason = rowMatch[2].trim().replace(/^'|'$/g, "");

    // Get source for better error messages
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

    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${reason}`,
      source,
      suggestion: `Create ${reason} that covers this requirement`,
    });
  }

  return violations;
}
```

## File: packages/cli/src/commands/doctor.ts
```typescript
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

interface DoctorCheck {
  name: string;
  check: () => { passed: boolean; message: string; remediation?: string };
}

export async function doctorCommand(): Promise<void> {
  const checks: DoctorCheck[] = [
    {
      name: "SWI-Prolog",
      check: checkSWIProlog,
    },
    {
      name: ".kb/ directory",
      check: checkKbDirectory,
    },
    {
      name: "config.json",
      check: checkConfigJson,
    },
    {
      name: "Git repository",
      check: checkGitRepository,
    },
    {
      name: "Git hooks",
      check: checkGitHooks,
    },
    {
      name: "pre-commit hook",
      check: checkPreCommitHook,
    },
  ];

  console.log("Kibi Environment Diagnostics\n");

  let allPassed = true;

  for (const { name, check } of checks) {
    const result = check();
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${name}: ${result.message}`);

    if (!result.passed) {
      allPassed = false;
      if (result.remediation) {
        console.log(`  → ${result.remediation}`);
      }
    }
  }

  console.log();

  if (allPassed) {
    console.log("All checks passed! Your environment is ready.");
    process.exit(0);
  } else {
    console.log("Some checks failed. Please address the issues above.");
    process.exit(1);
  }
}

function checkSWIProlog(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    const output = execSync("swipl --version", { encoding: "utf-8" });
    const versionMatch = output.match(/version\s+(\d+)\.(\d+)/i);

    if (!versionMatch) {
      return {
        passed: false,
        message: "Unable to parse version",
        remediation: "Reinstall SWI-Prolog from https://www.swi-prolog.org/",
      };
    }

    const major = Number.parseInt(versionMatch[1], 10);

    if (major < 9) {
      return {
        passed: false,
        message: `Version ${major}.x found (requires ≥9.0)`,
        remediation:
          "Upgrade SWI-Prolog to version 9.0 or higher from https://www.swi-prolog.org/",
      };
    }

    return {
      passed: true,
      message: `Version ${versionMatch[0]} installed`,
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not installed or not in PATH",
      remediation:
        "Install SWI-Prolog from https://www.swi-prolog.org/ and add to PATH",
    };
  }
}

function checkKbDirectory(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const kbDir = path.join(process.cwd(), ".kb");

  if (!existsSync(kbDir)) {
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    };
  }

  return {
    passed: true,
    message: "Found",
  };
}

function checkConfigJson(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const configPath = path.join(process.cwd(), ".kb/config.json");

  if (!existsSync(configPath)) {
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    JSON.parse(content);

    return {
      passed: true,
      message: "Valid JSON",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Invalid JSON",
      remediation: "Fix .kb/config.json syntax or run: kibi init",
    };
  }
}

function checkGitRepository(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    execSync("git status", { stdio: "pipe", cwd: process.cwd() });

    return {
      passed: true,
      message: "Found",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not a git repository",
      remediation: "Run: git init",
    };
  }
}

function checkGitHooks(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
    };
  }

  if (postCheckoutExists && postMergeExists) {
    try {
      const checkoutStats = statSync(postCheckoutPath);
      const mergeStats = statSync(postMergePath);

      const checkoutExecutable = (checkoutStats.mode & 0o111) !== 0;
      const mergeExecutable = (mergeStats.mode & 0o111) !== 0;

      if (checkoutExecutable && mergeExecutable) {
        return {
          passed: true,
          message: "Installed and executable",
        };
      }
      return {
        passed: false,
        message: "Installed but not executable",
        remediation:
          "Run: chmod +x .git/hooks/post-checkout .git/hooks/post-merge",
      };
    } catch (error) {
      return {
        passed: false,
        message: "Unable to check hook permissions",
      };
    }
  }

  return {
    passed: false,
    message: "Partially installed",
    remediation: "Run: kibi init --hooks",
  };
}

function checkPreCommitHook(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");
  const preCommitPath = path.join(process.cwd(), ".git/hooks/pre-commit");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
    };
  }

  const preCommitExists = existsSync(preCommitPath);

  if (!preCommitExists) {
    return {
      passed: false,
      message: "Not installed",
      remediation: "Run: kibi init --hooks",
    };
  }

  try {
    const preCommitStats = statSync(preCommitPath);
    const preCommitExecutable = (preCommitStats.mode & 0o111) !== 0;

    if (preCommitExecutable) {
      return {
        passed: true,
        message: "Installed and executable",
      };
    }
    return {
      passed: false,
      message: "Installed but not executable",
      remediation: "Run: chmod +x .git/hooks/pre-commit",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions",
    };
  }
}
```

## File: packages/cli/src/commands/gc.ts
```typescript
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function gcCommand(options: {
  dryRun?: boolean;
  force?: boolean;
}) {
  // If force is true, perform deletion. Otherwise default to dry run.
  const dryRun = options?.force ? false : (options?.dryRun ?? true);

  try {
    const kbRoot = path.resolve(process.cwd(), ".kb/branches");

    if (!fs.existsSync(kbRoot)) {
      console.error("No branch KBs found (.kb/branches does not exist)");
      process.exitCode = 1;
      return;
    }

    let gitBranches: Set<string>;
    try {
      execSync("git rev-parse --git-dir", {
        encoding: "utf-8",
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const output = execSync("git branch --format='%(refname:short)'", {
        encoding: "utf-8",
        cwd: process.cwd(),
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
      console.error(
        `Not in a git repository or git command failed: ${message}`,
      );
      process.exitCode = 1;
      return;
    }

    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const staleBranches = kbBranches.filter(
      (kb) => kb !== "main" && !gitBranches.has(kb),
    );

    // Perform deletion when dryRun is false (force requested)
    const performDelete = !dryRun;
    let deletedCount = 0;
    if (performDelete && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    if (dryRun) {
      console.log(
        `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`,
      );
      if (staleBranches.length > 0) {
        for (const b of staleBranches) console.log(`  - ${b}`);
      }
    } else {
      console.log(`Deleted ${deletedCount} stale branch KB(s)`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Branch GC failed: ${message}`);
    process.exitCode = 1;
  }
}

export default gcCommand;
```

## File: packages/cli/src/commands/init-helpers.ts
```typescript
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";

const POST_CHECKOUT_HOOK = `#!/bin/sh
kibi sync
`;

const POST_MERGE_HOOK = `#!/bin/sh
kibi sync
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
set -e
kibi check
`;

const DEFAULT_CONFIG = {
  paths: {
    requirements: "requirements",
    scenarios: "scenarios",
    tests: "tests",
    adr: "adr",
    flags: "flags",
    events: "events",
    facts: "facts",
    symbols: "symbols.yaml",
  },
};

export async function getCurrentBranch(
  cwd: string = process.cwd(),
): Promise<string> {
  let currentBranch = "develop";
  try {
    const { execSync } = await import("node:child_process");
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
    }).trim();
    if (branch && branch !== "master") {
      currentBranch = branch;
    }
  } catch {
    currentBranch = "develop";
  }
  return currentBranch;
}

export function createKbDirectoryStructure(
  kbDir: string,
  currentBranch: string,
): void {
  mkdirSync(kbDir, { recursive: true });
  mkdirSync(path.join(kbDir, "schema"), { recursive: true });
  mkdirSync(path.join(kbDir, "branches", currentBranch), {
    recursive: true,
  });
  console.log("✓ Created .kb/ directory structure");
  console.log(`✓ Created branches/${currentBranch}/ directory`);
}

export function createConfigFile(kbDir: string): void {
  writeFileSync(
    path.join(kbDir, "config.json"),
    JSON.stringify(DEFAULT_CONFIG, null, 2),
  );
  console.log("✓ Created config.json with default paths");
}

export function updateGitIgnore(cwd: string): void {
  const gitignorePath = path.join(cwd, ".gitignore");
  const gitignoreContent = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";

  if (!gitignoreContent.includes(".kb/")) {
    const newContent = gitignoreContent
      ? `${gitignoreContent.trimEnd()}\n.kb/\n`
      : ".kb/\n";
    writeFileSync(gitignorePath, newContent);
    console.log("✓ Added .kb/ to .gitignore");
  }
}

export async function copySchemaFiles(
  kbDir: string,
  schemaSourceDir: string,
): Promise<void> {
  const schemaFiles = await fg("*.pl", {
    cwd: schemaSourceDir,
    absolute: false,
  });

  for (const file of schemaFiles) {
    const sourcePath = path.join(schemaSourceDir, file);
    const destPath = path.join(kbDir, "schema", file);
    copyFileSync(sourcePath, destPath);
  }
  console.log(`✓ Copied ${schemaFiles.length} schema files`);
}

export function installHook(hookPath: string, content: string): void {
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (!existing.includes("kibi")) {
      writeFileSync(
        hookPath,
        `${existing}
${content}`,
        {
          mode: 0o755,
        },
      );
    }
  } else {
    writeFileSync(
      hookPath,
      `#!/bin/sh
${content}`,
      { mode: 0o755 },
    );
  }
}

export function installGitHooks(gitDir: string): void {
  const hooksDir = path.join(gitDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const postCheckoutPath = path.join(hooksDir, "post-checkout");
  const postMergePath = path.join(hooksDir, "post-merge");
  const preCommitPath = path.join(hooksDir, "pre-commit");

  installHook(postCheckoutPath, POST_CHECKOUT_HOOK.replace("#!/bin/sh\n", ""));
  installHook(postMergePath, POST_MERGE_HOOK.replace("#!/bin/sh\n", ""));
  installHook(preCommitPath, PRE_COMMIT_HOOK.replace("#!/bin/sh\n", ""));

  console.log("✓ Installed git hooks (pre-commit, post-checkout, post-merge)");
}
```

## File: packages/cli/src/commands/init.ts
```typescript
import { existsSync } from "node:fs";
import * as path from "node:path";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  getCurrentBranch,
  installGitHooks,
  updateGitIgnore,
} from "./init-helpers";

interface InitOptions {
  hooks?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const kbDir = path.join(process.cwd(), ".kb");
  const kbExists = existsSync(kbDir);

  const currentBranch = await getCurrentBranch();

  try {
    if (!kbExists) {
      createKbDirectoryStructure(kbDir, currentBranch);
      createConfigFile(kbDir);
      updateGitIgnore(process.cwd());

      const cliSrcDir = path.resolve(__dirname, "..");
      const schemaSourceDir = path.resolve(cliSrcDir, "../../core/schema");

      await copySchemaFiles(kbDir, schemaSourceDir);
    } else {
      console.log("✓ .kb/ directory already exists, skipping creation");
    }

    if (options.hooks) {
      const gitDir = path.join(process.cwd(), ".git");
      if (!existsSync(gitDir)) {
        console.error("Warning: No git repository found, skipping hooks");
      } else {
        installGitHooks(gitDir);
      }
    }

    console.log("\nKibi initialized successfully!");
    console.log("Next steps:");
    console.log("  1. Run 'kibi doctor' to verify setup");
    console.log("  2. Run 'kibi sync' to extract entities from documents");

    process.exit(0);
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
}
```

## File: packages/cli/src/commands/query.ts
```typescript
import * as path from "node:path";
import Table from "cli-table3";
import { PrologProcess } from "../prolog.js";

interface QueryOptions {
  id?: string;
  tag?: string;
  source?: string;
  relationships?: string;
  format?: "json" | "table";
  limit?: string;
  offset?: string;
}

export async function queryCommand(
  type: string | undefined,
  options: QueryOptions,
): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    let currentBranch = "main";
    try {
      const { execSync } = await import("node:child_process");
      currentBranch = execSync("git branch --show-current", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      if (!currentBranch || currentBranch === "master") currentBranch = "main";
    } catch {
      currentBranch = "main";
    }

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(
        `Error: Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
      process.exit(1);
    }

    let results: any[] = [];

    // Query relationships mode
    if (options.relationships) {
      const goal = `findall([Type,From,To], kb_relationship(Type, ${options.relationships}, To), Results)`;
      const queryResult = await prolog.query(goal);

      if (queryResult.success && queryResult.bindings.Results) {
        const relationshipsData = parseListOfLists(
          queryResult.bindings.Results,
        );

        results = relationshipsData.map((rel) => ({
          type: rel[0],
          from: options.relationships,
          to: rel[1],
        }));
      }
    }
    // Query entities mode
    else if (type || options.source) {
      // Validate type if provided
      if (type) {
        const validTypes = [
          "req",
          "scenario",
          "test",
          "adr",
          "flag",
          "event",
          "symbol",
          "fact",
        ];
        if (!validTypes.includes(type)) {
          await prolog.query("kb_detach");
          await prolog.terminate();
          console.error(
            `Error: Invalid type '${type}'. Valid types: ${validTypes.join(", ")}`,
          );
          process.exit(1);
        }
      }

      let goal: string;

      if (options.source) {
        // Query by source path (substring match)
        const safeSource = String(options.source).replace(/'/g, "\\'");
        if (type) {
          goal = `findall([Id,'${type}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${type}', Props)), Results)`;
        } else {
          goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
        }
      } else if (options.id) {
        const safeId = String(options.id).replace(/'/g, "''");
        goal = `kb_entity('${safeId}', '${type}', Props), Id = '${safeId}', Type = '${type}', Result = [Id, Type, Props]`;
      } else if (options.tag) {
        const safeTag = String(options.tag).replace(/'/g, "''");
        goal = `findall([Id,'${type}',Props], (kb_entity(Id, '${type}', Props), memberchk(tags=Tags, Props), member('${safeTag}', Tags)), Results)`;
      } else {
        goal = `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`;
      }

      const queryResult = await prolog.query(goal);

      if (queryResult.success) {
        if (options.id) {
          // Single entity query
          if (queryResult.bindings.Result) {
            const entity = parseEntityFromBinding(queryResult.bindings.Result);
            results = [entity];
          }
        } else {
          // Multiple entities query
          if (queryResult.bindings.Results) {
            const entitiesData = parseListOfLists(queryResult.bindings.Results);

            for (const data of entitiesData) {
              const entity = parseEntityFromList(data);
              results.push(entity);
            }
          }
        }
      }
    } else {
      await prolog.query("kb_detach");
      await prolog.terminate();
      console.error(
        "Error: Must specify entity type, --source, or --relationships option",
      );
      process.exit(1);
    }

    await prolog.query("kb_detach");
    await prolog.terminate();

    // Apply pagination
    const limit = Number.parseInt(options.limit || "100");
    const offset = Number.parseInt(options.offset || "0");
    const paginated = results.slice(offset, offset + limit);

    if (!paginated || paginated.length === 0) {
      if (options.format === "json") {
        console.log("[]");
      } else {
        console.log("No entities found");
      }
      process.exit(0);
    }

    // Format output
    if (options.format === "table") {
      outputTable(paginated, Boolean(options.relationships));
    } else {
      console.log(JSON.stringify(paginated, null, 2));
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

/**
 * Parse a Prolog list of lists into a JavaScript array.
 * Input: "[[a,b,c],[d,e,f]]"
 * Output: [["a", "b", "c"], ["d", "e", "f"]]
 */
function parseListOfLists(listStr: string): string[][] {
  // Clean input
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let inQuotes = false;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prevChar = i > 0 ? cleaned[i - 1] : "";

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (inQuotes) {
      current += char;
      continue;
    }

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
      // Skip comma between lists
    } else {
      current += char;
    }
  }

  return results;
}

/**
 * Parse a single entity from Prolog binding format.
 * Input: "[abc123, req, [id=abc123, title=\"Test\", ...]]"
 */
function parseEntityFromBinding(bindingStr: string): any {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevel(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const id = parts[0].trim();
  const type = parts[1].trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { id, type, ...props };
}

/**
 * Parse entity from array returned by parseListOfLists.
 * Input: ["abc123", "req", "[id=abc123, title=\"Test\", ...]"]
 */
function parseEntityFromList(data: string[]): any {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { id, type, ...props };
}

/**
 * Parse Prolog property list into JavaScript object.
 * Input: "[id=abc123, title=^^(\"User Auth\", xsd:string), status='file:///path/approved', tags=^^(\"[security,auth]\", xsd:string)]"
 * Output: { id: "abc123", title: "User Auth", status: "approved", tags: ["security", "auth"] }
 */
function parsePropertyList(propsStr: string): Record<string, any> {
  const props: Record<string, any> = {};

  // Remove outer brackets
  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  // Split by top-level commas
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

/**
 * Parse a single Prolog value, handling typed literals and URIs.
 * Examples:
 * - ^^("value", 'http://...#string') -> "value"
 * - 'file:///path/to/id' -> "id" (extract last segment)
 * - "string" -> "string"
 * - atom -> "atom"
 * - [a,b,c] -> ["a", "b", "c"]
 */
function parsePrologValue(value: string): any {
  value = value.trim();

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
    const cleaned = value;
    const lastSlash = cleaned.lastIndexOf("/");
    if (lastSlash !== -1) {
      return cleaned.substring(lastSlash + 1);
    }
    return cleaned;
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  // Handle quoted atom (may contain file URLs that need extraction)
  if (value.startsWith("'") && value.endsWith("'")) {
    const unquoted = value.substring(1, value.length - 1);
    // Check if unquoted value is a file URL
    if (unquoted.startsWith("file:///")) {
      const lastSlash = unquoted.lastIndexOf("/");
      if (lastSlash !== -1) {
        return unquoted.substring(lastSlash + 1);
      }
    }
    return unquoted;
  }

  // Handle list
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

  // Return as-is
  return value;
}

/**
 * Split a string by delimiter at the top level (not inside brackets or quotes).
 */
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

/**
 * Output results as a formatted table.
 */
function outputTable(items: any[], isRelationships: boolean): void {
  if (items.length === 0) {
    console.log("No entities found.");
    return;
  }

  if (isRelationships) {
    const table = new Table({
      head: ["Type", "From", "To"],
      colWidths: [20, 18, 18],
    });

    for (const item of items) {
      table.push([
        item.type || "N/A",
        item.from?.substring(0, 16) || "N/A",
        item.to?.substring(0, 16) || "N/A",
      ]);
    }

    console.log(table.toString());
  } else {
    const table = new Table({
      head: ["ID", "Type", "Title", "Status", "Tags"],
      colWidths: [18, 10, 40, 12, 30],
    });

    for (const entity of items) {
      table.push([
        entity.id?.substring(0, 16) || "N/A",
        entity.type || "N/A",
        (entity.title || "N/A").substring(0, 38),
        entity.status || "N/A",
        (entity.tags || []).join(", ").substring(0, 28) || "",
      ]);
    }

    console.log(table.toString());
  }
}
```

## File: packages/cli/src/commands/sync.ts
```typescript
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { extractFromManifest } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdown,
} from "../extractors/markdown.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../extractors/symbols-coordinator.js";
import { PrologProcess } from "../prolog.js";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

type SyncCache = {
  version: 1;
  hashes: Record<string, string>;
  seenAt: Record<string, string>;
};

const SYNC_CACHE_VERSION = 1;
const SYNC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SYMBOLS_MANIFEST_COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb.symbols.refresh\` MCP tool to refresh coordinates.
`;
const SYMBOL_COORD_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);
const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

function toCacheKey(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function readSyncCache(cachePath: string): SyncCache {
  if (!existsSync(cachePath)) {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }

  try {
    const parsed = JSON.parse(
      readFileSync(cachePath, "utf8"),
    ) as Partial<SyncCache>;
    if (parsed.version !== SYNC_CACHE_VERSION) {
      return {
        version: SYNC_CACHE_VERSION,
        hashes: {},
        seenAt: {},
      };
    }

    return {
      version: SYNC_CACHE_VERSION,
      hashes: parsed.hashes ?? {},
      seenAt: parsed.seenAt ?? {},
    };
  } catch {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }
}

function writeSyncCache(cachePath: string, cache: SyncCache): void {
  const cacheDir = path.dirname(cachePath);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  writeFileSync(
    cachePath,
    `${JSON.stringify(cache, null, 2)}
`,
    "utf8",
  );
}

export async function syncCommand(
  options: {
    validateOnly?: boolean;
  } = {},
): Promise<void> {
  const validateOnly = options.validateOnly ?? false;
  try {
    // Detect current branch early (needed for cache and KB paths)
    let currentBranch = "main";
    try {
      const { execSync } = await import("node:child_process");
      const branch = execSync("git branch --show-current", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      if (branch && branch !== "master") {
        currentBranch = branch;
      }
    } catch {
      currentBranch = "main";
    }
    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] currentBranch:", currentBranch);
      } catch {}
    }

    // Load config (fall back to defaults if missing)
    const DEFAULT_CONFIG = {
      paths: {
        requirements: "requirements/**/*.md",
        scenarios: "scenarios/**/*.md",
        tests: "tests/**/*.md",
        adr: "adr/**/*.md",
        flags: "flags/**/*.md",
        events: "events/**/*.md",
        facts: "facts/**/*.md",
        symbols: "symbols.yaml",
      },
    };

    type SyncConfig = {
      paths: Record<string, string>;
    };

    const configPath = path.join(process.cwd(), ".kb/config.json");
    let config: SyncConfig;
    try {
      const parsed = JSON.parse(
        readFileSync(configPath, "utf8"),
      ) as Partial<SyncConfig>;
      config = {
        paths: {
          ...DEFAULT_CONFIG.paths,
          ...(parsed.paths ?? {}),
        },
      };
    } catch {
      config = DEFAULT_CONFIG;
    }
    const paths = config.paths;

    // Discover files - construct glob patterns from directory paths
    const normalizeMarkdownPath = (
      pattern: string | undefined,
    ): string | null => {
      if (!pattern) return null;
      if (pattern.includes("*")) return pattern;
      return `${pattern}/**/*.md`;
    };

    const markdownPatterns = [
      normalizeMarkdownPath(paths.requirements),
      normalizeMarkdownPath(paths.scenarios),
      normalizeMarkdownPath(paths.tests),
      normalizeMarkdownPath(paths.adr),
      normalizeMarkdownPath(paths.flags),
      normalizeMarkdownPath(paths.events),
      normalizeMarkdownPath(paths.facts),
    ].filter((p): p is string => Boolean(p));

    const markdownFiles = await fg(markdownPatterns, {
      cwd: process.cwd(),
      absolute: true,
    });

    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] markdownPatterns:", markdownPatterns);
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] markdownFiles:", markdownFiles);
      } catch {}
    }

    const manifestFiles = await fg(paths.symbols, {
      cwd: process.cwd(),
      absolute: true,
    });

    const sourceFiles = [...markdownFiles, ...manifestFiles].sort();
    // Use branch-specific cache to handle branch isolation correctly
    const cachePath = path.join(
      process.cwd(),
      `.kb/branches/${currentBranch}/sync-cache.json`,
    );
    const syncCache = readSyncCache(cachePath);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const nextHashes: Record<string, string> = {};
    const nextSeenAt: Record<string, string> = {};
    const changedMarkdownFiles: string[] = [];
    const changedManifestFiles: string[] = [];

    for (const file of sourceFiles) {
      try {
        const key = toCacheKey(file);
        const hash = hashFile(file);
        const lastSeen = syncCache.seenAt[key];
        const lastSeenMs = lastSeen ? Date.parse(lastSeen) : Number.NaN;
        const expired = Number.isNaN(lastSeenMs)
          ? false
          : nowMs - lastSeenMs > SYNC_CACHE_TTL_MS;

        nextHashes[key] = hash;
        nextSeenAt[key] = nowIso;

        if (expired || syncCache.hashes[key] !== hash || validateOnly) {
          if (markdownFiles.includes(file)) {
            changedMarkdownFiles.push(file);
          } else {
            changedManifestFiles.push(file);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to hash ${file}: ${message}`);
      }
    }

    const results: ExtractionResult[] = [];
    const failedCacheKeys = new Set<string>();
    const errors: { file: string; message: string }[] = [];

    for (const file of changedMarkdownFiles) {
      try {
        results.push(extractFromMarkdown(file));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (validateOnly) {
          errors.push({ file, message });
        } else {
          console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        }
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    for (const file of changedManifestFiles) {
      try {
        const manifestResults = extractFromManifest(file);
        results.push(...manifestResults);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (validateOnly) {
          errors.push({ file, message });
        } else {
          console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        }
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    if (validateOnly) {
      if (errors.length > 0) {
        for (const err of errors) {
          console.error(`${err.file}: ${err.message}`);
        }
        console.error(`FAILED: ${errors.length} errors found`);
        process.exit(1);
      } else {
        console.log(`OK: Validation passed (${results.length} entities)`);
        process.exit(0);
      }
    }

    for (const file of manifestFiles) {
      try {
        await refreshManifestCoordinates(file, process.cwd());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to refresh symbol coordinates in ${file}: ${message}`,
        );
      }
    }

    if (results.length === 0) {
      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
      }

      writeSyncCache(cachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
      });

      console.log("✓ Imported 0 entities, 0 relationships");
      process.exit(0);
    }

    // Connect to KB
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const mainPath = path.join(process.cwd(), ".kb/branches/main");

    // If branch KB doesn't exist but main does, copy from main (copy-on-write)
    // Skip for orphan branches (branches with no commits yet)
    if (!existsSync(kbPath) && existsSync(mainPath)) {
      const hasCommits = (() => {
        try {
          const { execSync } = require("node:child_process");
          execSync("git rev-parse HEAD", { cwd: process.cwd(), stdio: "pipe" });
          return true;
        } catch {
          return false;
        }
      })();
      if (hasCommits) {
        fs.cpSync(mainPath, kbPath, { recursive: true });
        // Remove copied sync cache to avoid cross-branch cache pollution
        try {
          const copiedCache = path.join(kbPath, "sync-cache.json");
          if (existsSync(copiedCache)) {
            fs.rmSync(copiedCache);
          }
        } catch {
          // ignore errors cleaning up cache
        }
      }
    }

    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      throw new SyncError(
        `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    // Upsert entities
    let entityCount = 0;
    let kbModified = false;
    const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
    const prologAtom = (value: string): string =>
      simplePrologAtom.test(value) ? value : `'${value.replace(/'/g, "''")}'`;
    for (const { entity } of results) {
      try {
        const props = [
          `id='${entity.id}'`,
          `title="${entity.title.replace(/"/g, '\\"')}"`,
          `status=${prologAtom(entity.status)}`,
          `created_at="${entity.created_at}"`,
          `updated_at="${entity.updated_at}"`,
          `source="${entity.source.replace(/"/g, '\\"')}"`,
        ];

        if (entity.tags && entity.tags.length > 0) {
          const tagsList = entity.tags.map(prologAtom).join(",");
          props.push(`tags=[${tagsList}]`);
        }
        if (entity.owner) props.push(`owner=${prologAtom(entity.owner)}`);
        if (entity.priority)
          props.push(`priority=${prologAtom(entity.priority)}`);
        if (entity.severity)
          props.push(`severity=${prologAtom(entity.severity)}`);
        if (entity.text_ref) props.push(`text_ref="${entity.text_ref}"`);

        const propsList = `[${props.join(", ")}]`;
        const goal = `kb_assert_entity(${entity.type}, ${propsList})`;
        const result = await prolog.query(goal);
        if (result.success) {
          entityCount++;
          kbModified = true;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to upsert entity ${entity.id}: ${message}`,
        );
      }
    }

    // Build ID lookup map: filename -> entity ID
    const idLookup = new Map<string, string>();
    for (const { entity } of results) {
      const filename = path.basename(entity.source, ".md");
      idLookup.set(filename, entity.id);
      idLookup.set(entity.id, entity.id);
    }

    // Assert relationships
    let relCount = 0;
    for (const { relationships } of results) {
      for (const rel of relationships) {
        try {
          const fromId = idLookup.get(rel.from) || rel.from;
          const toId = idLookup.get(rel.to) || rel.to;

          const goal = `kb_assert_relationship(${rel.type}, '${fromId}', '${toId}', [])`;
          const result = await prolog.query(goal);
          if (result.success) {
            relCount++;
            kbModified = true;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to assert relationship ${rel.type}: ${rel.from} -> ${rel.to}: ${message}`,
          );
        }
      }
    }

    if (kbModified) {
      prolog.invalidateCache();
    }

    // Save KB and detach
    await prolog.query("kb_save");
    await prolog.query("kb_detach");
    await prolog.terminate();

    const evictedHashes: Record<string, string> = {};
    const evictedSeenAt: Record<string, string> = {};

    for (const [key, hash] of Object.entries(nextHashes)) {
      if (failedCacheKeys.has(key)) {
        continue;
      }
      evictedHashes[key] = hash;
      evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
    }

    writeSyncCache(cachePath, {
      version: SYNC_CACHE_VERSION,
      hashes: evictedHashes,
      seenAt: evictedSeenAt,
    });

    console.log(
      `✓ Imported ${entityCount} entities, ${relCount} relationships`,
    );
    process.exit(0);
  } catch (error) {
    if (error instanceof SyncError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

async function refreshManifestCoordinates(
  manifestPath: string,
  workspaceRoot: string,
): Promise<void> {
  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed)) {
    console.warn(
      `Warning: symbols manifest ${manifestPath} is not a YAML object; skipping coordinate refresh`,
    );
    return;
  }

  const rawSymbols = parsed.symbols;
  if (!Array.isArray(rawSymbols)) {
    console.warn(
      `Warning: symbols manifest ${manifestPath} has no symbols array; skipping coordinate refresh`,
    );
    return;
  }

  const before = rawSymbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );
  const enriched = await enrichSymbolCoordinates(before, workspaceRoot);
  parsed.symbols = enriched;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < before.length; i++) {
    const previous = before[i] ?? ({} as ManifestSymbolEntry);
    const current = enriched[i] ?? previous;
    const changed = GENERATED_COORD_FIELDS.some(
      (field) => previous[field] !== current[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const eligible = isEligibleForCoordinateRefresh(
      typeof current.sourceFile === "string"
        ? current.sourceFile
        : typeof previous.sourceFile === "string"
          ? previous.sourceFile
          : undefined,
      workspaceRoot,
    );

    if (eligible && !hasAllGeneratedCoordinates(current)) {
      failed++;
    } else {
      unchanged++;
    }
  }

  const dumped = dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumped}`;

  if (rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  console.log(
    `✓ Refreshed symbol coordinates in ${path.relative(workspaceRoot, manifestPath)} (refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed})`,
  );
}

function hasAllGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number" &&
    typeof entry.coordinatesGeneratedAt === "string" &&
    entry.coordinatesGeneratedAt.length > 0
  );
}

function isEligibleForCoordinateRefresh(
  sourceFile: string | undefined,
  workspaceRoot: string,
): boolean {
  if (!sourceFile) return false;
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);

  if (!existsSync(absolute)) return false;
  const ext = path.extname(absolute).toLowerCase();
  return SYMBOL_COORD_EXTENSIONS.has(ext);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

## File: packages/cli/src/cli.ts
```typescript
import { Command } from "commander";
import packageJson from "../package.json";
import { branchEnsureCommand } from "./commands/branch";
import { checkCommand } from "./commands/check";
import { doctorCommand } from "./commands/doctor";
import { gcCommand } from "./commands/gc.js";
import { initCommand } from "./commands/init";
import { queryCommand } from "./commands/query";
import { syncCommand } from "./commands/sync";

const program = new Command();

program
  .name("kibi")
  .description("Prolog-based project knowledge base")
  .version(packageJson.version);

program
  .command("init")
  .description("Initialize .kb/ directory")
  .option("--no-hooks", "Do not install git hooks (hooks installed by default)")
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command("sync")
  .description("Sync entities from documents")
  .option("--validate-only", "Perform validation without mutations")
  .action(async (options) => {
    await syncCommand(options);
  });

program
  .command("query [type]")
  .description("Query knowledge base")
  .option("--id <id>", "Query specific entity by ID")
  .option("--tag <tag>", "Filter by tag")
  .option("--source <path>", "Filter by source file path (substring match)")
  .option("--relationships <id>", "Get relationships from entity")
  .option("--format <format>", "Output format: json|table", "json")
  .option("--limit <n>", "Limit results", "100")
  .option("--offset <n>", "Skip results", "0")
  .action(async (type, options) => {
    await queryCommand(type, options);
  });

program
  .command("check")
  .description("Check KB consistency and integrity")
  .option("--fix", "Suggest fixes for violations")
  .action(async (options) => {
    await checkCommand(options);
  });

program
  .command("gc")
  .description("Garbage collect stale branch KBs")
  .option("--dry-run", "Preview without deleting (default)", true)
  .option("--force", "Actually delete stale branches")
  .action(async (options) => {
    const dryRun = !options.force;
    await gcCommand({ dryRun, force: options.force });
  });

program
  .command("doctor")
  .description("Diagnose KB setup and configuration")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("branch")
  .description("Manage branch KBs")
  .argument("<action>", "Action: ensure")
  .action(async (action) => {
    if (action === "ensure") {
      await branchEnsureCommand();
    }
  });

program.parse(process.argv);
```

## File: packages/cli/package.json
```json
{
  "name": "@kibi/cli",
  "version": "0.1.0",
  "private": true,
  "bin": {
    "kibi": "./bin/kibi"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "cli-table3": "^0.6.5",
    "commander": "^11.0.0",
    "fast-glob": "^3.2.12",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0",
    "ts-morph": "^23.0.0"
  }
}
```


---

#### 🔙 PREVIOUS PART: [kibi-00-context-1.md](file:kibi-00-context-1.md)

#### ⏭️ NEXT PART: [kibi-01-logic-2.md](file:kibi-01-logic-2.md)

> _End of Part 2_
