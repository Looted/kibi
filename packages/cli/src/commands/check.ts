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

    violations.push(...(await checkRequiredFields(prolog, allEntityIds)));

    await prolog.query("kb_detach");
    await prolog.terminate();

    if (violations.length === 0) {
      console.log("✓ No violations found. KB is valid.");
      process.exit(0);
    }

    console.log(`Found ${violations.length} violation(s):\n`);

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
  const mustReqs: string[] = [];

  const allReqIds = await getAllEntityIds(prolog, "req");

  for (const reqId of allReqIds) {
    const propsResult = await prolog.query(
      `kb_entity('${reqId}', req, Props), memberchk(priority=P, Props), atom_string(P, PS), sub_string(PS, _, 4, 0, "must")`,
    );

    if (propsResult.success) {
      mustReqs.push(reqId);
    }
  }

  return mustReqs;
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
