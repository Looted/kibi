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
      `kb_relationship(specified_by, ScenarioId, '${reqId}')`,
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

  return parsePrologList(result.bindings.Ids);
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

  return parsePrologList(result.bindings.Ids);
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

function parsePrologList(raw: string): string[] {
  const match = raw.match(/\[(.*)\]/);
  if (!match) {
    return [];
  }

  const content = match[1].trim();
  if (!content) {
    return [];
  }

  return content.split(",").map((id) => id.trim().replace(/^'|'$/g, ""));
}
