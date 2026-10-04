// implements REQ-kibi-truthful-consistency, REQ-kibi-scenario-feasibility-v2, REQ-kibi-search-answer-layer-v2
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "../helpers/isolated-env.js";

/**
 * A fresh consumer workspace driven only through the built `kibi` binary:
 * `git init`, `kibi init`, authored `.kb` documents, `kibi sync`, then public
 * JSON routes.
 */

const KIBI_CLI = path.resolve(import.meta.dir, "../../bin/kibi");

export type Json = Record<string, unknown>;

export type ConsumerWorkspace = Readonly<{
  root: string;
  write(relativePath: string, content: string): void;
  sync(): void;
  json(args: readonly string[], input?: Json): Json;
  cleanup(): void;
}>;

function run(
  root: string,
  command: string,
  args: readonly string[],
  input?: string,
) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 120_000,
  });
}

export function createConsumerWorkspace(prefix: string): ConsumerWorkspace {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), prefix)));
  run(root, "git", ["init", "-q", "-b", "main"]);
  run(root, "node", [KIBI_CLI, "init"]);
  return {
    root,
    write(relativePath, content) {
      const target = path.join(root, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    },
    sync() {
      // `kibi sync` reads the Git-tracked source boundary.
      run(root, "git", ["add", ".kb"]);
      run(root, "node", [KIBI_CLI, "sync"]);
    },
    json(args, input) {
      // check exits non-zero when it reports violations; the JSON is still
      // the result.
      try {
        const stdout = run(
          root,
          "node",
          [KIBI_CLI, ...args, ...(input ? ["--input", "-"] : [])],
          input ? `${JSON.stringify(input)}\n` : undefined,
        );
        return JSON.parse(stdout) as Json;
      } catch (error) {
        const stdout = (error as { stdout?: unknown }).stdout;
        if (typeof stdout === "string" && stdout.trim().startsWith("{")) {
          return JSON.parse(stdout) as Json;
        }
        throw error;
      }
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** `kibi check --format json` violations for the given rules. */
export function checkViolations(
  workspace: ConsumerWorkspace,
  rules: string,
): Array<{ rule: string; entityId: string; description: string }> {
  const result = workspace.json([
    "check",
    "--format",
    "json",
    "--rules",
    rules,
  ]);
  const structured = result.structuredContent as Json;
  return structured.violations as Array<{
    rule: string;
    entityId: string;
    description: string;
  }>;
}

/**
 * Advisory rule findings for the given rule. `kibi check` reports advisory
 * rules as non-blocking qualityDiagnostics (id `rule.<rule>`), never as
 * violations.
 */
export function checkAdvisories(
  workspace: ConsumerWorkspace,
  rule: string,
): Array<{ entityId: string; message: string }> {
  const result = workspace.json(["check", "--format", "json", "--rules", rule]);
  const structured = result.structuredContent as Json;
  return (
    structured.qualityDiagnostics as Array<{
      id: string;
      entityId: string;
      message: string;
    }>
  ).filter((diagnostic) => diagnostic.id === `rule.${rule}`);
}

export type CoverageRow = Json & {
  id: string;
  proofGaps: string[];
  proofStages: Record<string, Json>;
};

/** `kibi coverage --format json` requirement rows by id. */
export function coverageRows(
  workspace: ConsumerWorkspace,
): Map<string, CoverageRow> {
  const result = workspace.json([
    "coverage",
    "--format",
    "json",
    "--include-passing",
  ]);
  const find = (value: unknown): CoverageRow[] | undefined => {
    if (value === null || typeof value !== "object") return undefined;
    const record = value as Json;
    if (Array.isArray(record.rows)) return record.rows as CoverageRow[];
    for (const nested of Object.values(record)) {
      const rows = find(nested);
      if (rows) return rows;
    }
    return undefined;
  };
  return new Map((find(result) ?? []).map((row) => [row.id, row]));
}

/** Front-matter document for a `.kb` entity. */
export function doc(frontMatter: string, body = ""): string {
  return `---\n${frontMatter.trim()}\n---\n${body}\n`;
}

export const QUOTA_SUBJECT = doc(`
id: FACT-QUOTA-SUBJECT
title: Client call quota
type: fact
status: active
fact_kind: subject
subject_key: client.call_quota
`);

export function quotaValueFact(
  id: string,
  title: string,
  operator: string,
  value: number,
  claim?: { key: string; text: string },
): string {
  return doc(`
id: ${id}
title: ${title}
type: fact
status: active
fact_kind: property_value
subject_key: client.call_quota
property_key: remaining
operator: ${operator}
value_type: int
value_int: ${value}
${claim ? `claim_key: ${claim.key}\nclaim_text: ${claim.text}` : ""}
`);
}

type AdvisorProposition = {
  claim_key: string;
  claim_text: string;
  role: string;
  status: string;
  span: { start: number; end: number };
};

/** The semantic advisor's clause ledger and inventory contract for prose. */
export function adviseProse(
  workspace: ConsumerWorkspace,
  prose: string,
): { contract: Json; propositions: AdvisorProposition[] } {
  const receipt = (
    workspace.json(["semantic-advisor"], { text: prose }).data as Json
  ).receipt as Json;
  return {
    contract: receipt.inventory_contract as Json,
    propositions: receipt.propositions as AdvisorProposition[],
  };
}

/** Front matter carrying a requirement's proposition ledger. */
export function semanticFrontMatter(
  prose: string,
  contract: Json,
  entries: readonly AdvisorProposition[],
): string {
  const inventory = entries
    .map(
      (p) => `  - claim_key: ${p.claim_key}
    claim_text: ${p.claim_text}
    role: ${p.role}
    status: ${p.status}
    span: {start: ${p.span.start}, end: ${p.span.end}}`,
    )
    .join("\n");
  return `semantic_text: ${prose}
semantic_inventory_version: ${contract.version}
semantic_source_field: ${contract.source_field}
semantic_source_hash: ${contract.source_hash}
semantic_inventory:
${inventory}
logic_claims: [${entries.map((p) => p.claim_key).join(", ")}]`;
}

/**
 * Author a current requirement whose single clause is grounded by one
 * client.call_quota.remaining property fact, as a consumer would after
 * running the semantic advisor.
 */
export function authorQuotaRequirement(
  workspace: ConsumerWorkspace,
  spec: Readonly<{
    id: string;
    title: string;
    prose: string;
    factId: string;
    operator: string;
    value: number;
  }>,
): void {
  const { contract, propositions } = adviseProse(workspace, spec.prose);
  if (propositions.length !== 1) {
    throw new Error(
      `expected one proposition for ${spec.id}, got ${propositions.length}`,
    );
  }
  const [claim] = propositions as [AdvisorProposition];
  workspace.write(
    `.kb/facts/${spec.factId}.md`,
    quotaValueFact(spec.factId, spec.title, spec.operator, spec.value, {
      key: claim.claim_key,
      text: claim.claim_text,
    }),
  );
  workspace.write(
    `.kb/requirements/${spec.id}.md`,
    doc(
      `
id: ${spec.id}
title: ${spec.title}
type: req
status: open
priority: must
${semanticFrontMatter(spec.prose, contract, [{ ...claim, status: "modeled" }])}
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: ${spec.factId}
`,
      spec.prose,
    ),
  );
}
