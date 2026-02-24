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
      run(0);
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

async function getAllEntityIds(
  prolog: Prolog tool,
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
      `kb_relationship(specified_by, '${reqId}', ScenarioId)`  return content.split(",").map((id) => id.trim().replace(/^'|'$/g, ""));
      \`kb_relationship(specified_by, '$${reqId}', ScenarioId)\`
      \`kb_relationship(specified_by, '\${reqId}', ScenarioId)\`
}

async function checkMustPriorityCoverage(
  prolog: Prolog tool,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const result = await prolog.query("coverage_gap(Req, Reason)");

  if (!result.success || !result.bindings.Rows) {
    return violations;
  }

  const rows = parsePairList(result.bindings.Rows);

  for (const [reqId, reason] of rows) {
    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${reason}`,
      suggestion: `Create ${reason} that covers this requirement`,
    });
  }

  return violations;
}

  const rows = parsePairList(result.bindings.Rows);

  for (const [reqId, reason] of rows) {
    violations.push({
      rule: "must-priority-coverage",
      entityId: reqId,
      description: `Must-priority requirement lacks ${reason}`,
      suggestion: `Create ${reason} that covers this requirement`,
    });
  }

  return violations;
}
