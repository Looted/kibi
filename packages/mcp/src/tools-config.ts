/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { advertisedInputSchema, getSpec } from "kibi-runtime";
import type { OperationName } from "kibi-runtime";

import {
  DIAGNOSTIC_MODE_ENABLED,
  DIAGNOSTIC_TELEMETRY_SCHEMA,
} from "./diagnostics.js";
import { withWorkspaceRootSchema } from "./server/workspace-router.js";

interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: ToolAnnotations;
}

/**
 * The agent-facing tool list. Narrower operations (kb_skills_list,
 * kb_semantic_advisor, kb_model_requirement, kb_suggest_predicates,
 * kb_validate_upsert) stay in the operation catalog and on the CLI; MCP
 * reaches them through kb_skills, kb_model and kb_upsert dryRun so hosts
 * load fewer tool definitions.
 */
const MCP_TOOL_ORDER = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_model",
  "kb_upsert",
  "kb_record",
  "kb_delete",
  "kb_check",
  "kb_review_firm_edit",
  "kb_prepare_impact_review",
  "kb_plan_bootstrap",
  "kb_compile_intent",
  "kb_apply_plan",
  "kb_ingest_proof",
] as const satisfies readonly OperationName[];

/**
 * The tools the opt-in `core` profile lists: the ones an agent uses on every
 * change, plus the firm-edit receipt that a blocking kb_check finding asks
 * for, so the agent can answer it without a shell. Under `core` every other
 * operation runs through the CLI peer route (`kibi <route> --input -`).
 */
export const DEFAULT_PROFILE_TOOLS = [
  "kb_search",
  "kb_query",
  "kb_record",
  "kb_upsert",
  "kb_check",
  "kb_status",
  "kb_skills",
  "kb_review_firm_edit",
] as const satisfies readonly OperationName[];

/** Listed in the core profile too while the knowledge base is empty. */
export const BOOTSTRAP_TOOLS = [
  "kb_plan_bootstrap",
  "kb_apply_plan",
] as const satisfies readonly OperationName[];

export const TOOL_PROFILES = ["full", "core"] as const;
export type ToolProfile = (typeof TOOL_PROFILES)[number];

const TOOL_PROFILE_ENV = "KIBI_MCP_TOOLS";

function isToolProfile(value: unknown): value is ToolProfile {
  return (TOOL_PROFILES as readonly unknown[]).includes(value);
}

/**
 * The JSON value in a file as an object to read fields from: a missing or
 * malformed file, or a value that is not an object, has no fields.
 */
function readJsonFields(file: string): Record<string, unknown> {
  try {
    return Object(JSON.parse(readFileSync(file).toString()));
  } catch {
    return {};
  }
}

/**
 * The profile a project records next to its other Kibi setup choices:
 * `kibi.mcpTools` in the root package.json, else `mcpTools` in
 * `.kb/setup.json`.
 */
function recordedToolProfile(
  workspaceRoot: string,
  warn: (message: string) => void,
): ToolProfile | undefined {
  const fromPackage = Object(
    readJsonFields(path.join(workspaceRoot, "package.json")).kibi,
  ).mcpTools;
  if (isToolProfile(fromPackage)) return fromPackage;
  if (fromPackage !== undefined)
    warn(unknownProfile("kibi.mcpTools in package.json", fromPackage));
  const fromSetup = readJsonFields(
    path.join(workspaceRoot, ".kb", "setup.json"),
  ).mcpTools;
  if (isToolProfile(fromSetup)) return fromSetup;
  if (fromSetup !== undefined)
    warn(unknownProfile("mcpTools in .kb/setup.json", fromSetup));
  return undefined;
}

function unknownProfile(where: string, value: unknown): string {
  return `[KIBI-MCP] ${where} is ${JSON.stringify(value)}, which names no tool profile (${TOOL_PROFILES.join(" or ")}); it is ignored.\n`;
}

/**
 * The tool profile for this server: `KIBI_MCP_TOOLS` (which `kibi-mcp
 * --tools <profile>` sets) when it names one, else the project's recorded
 * choice, else `full`. Every tool is listed by default so an agent never
 * depends on a CLI it may not be able to run; `core` is for a project that
 * wants a shorter list on a host that loads every tool schema up front.
 */
export function resolveToolProfile(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  // An unknown value is named on stderr; stdout carries the protocol.
  warn: (message: string) => void = (message) => {
    process.stderr.write(message);
  },
): ToolProfile {
  const requested = env[TOOL_PROFILE_ENV]?.trim().toLowerCase();
  if (isToolProfile(requested)) return requested;
  if (requested !== undefined && requested !== "")
    warn(unknownProfile(TOOL_PROFILE_ENV, env[TOOL_PROFILE_ENV]));
  return recordedToolProfile(workspaceRoot, warn) ?? "full";
}

/** Whether the workspace's `.kb/` holds no entity yet (or does not exist). */
export function knowledgeBaseIsEmpty(workspaceRoot: string): boolean {
  const lanes = [
    "requirements",
    "scenarios",
    "tests",
    "facts",
    "adr",
    "flags",
    "events",
  ];
  return !lanes.some((lane) => {
    const dir = path.join(workspaceRoot, ".kb", lane);
    return (
      statSync(dir, { throwIfNoEntry: false })?.isDirectory() === true &&
      readdirSync(dir).some((file) => file.endsWith(".md"))
    );
  });
}

/**
 * The catalog tools a session lists: every one in the `full` profile; the
 * core eight in the `core` profile, plus the bootstrap tools while the
 * knowledge base is empty.
 */
export function profileToolNames(
  profile: ToolProfile,
  kbEmpty: boolean,
): ReadonlySet<string> | undefined {
  if (profile === "full") return undefined;
  return new Set<string>([
    ...DEFAULT_PROFILE_TOOLS,
    ...(kbEmpty ? BOOTSTRAP_TOOLS : []),
  ]);
}

/** Tools registered only when named in KIBI_MCP_OPTIONAL_TOOLS. */
export const OPTIONAL_TOOL_NAMES = [
  "kb_sparql_remote",
  "kb_job_status",
] as const;
export type OptionalToolName = (typeof OPTIONAL_TOOL_NAMES)[number];

/**
 * Parse KIBI_MCP_OPTIONAL_TOOLS: a comma-separated list of optional tool
 * names, or "all".
 */
export function enabledOptionalTools(
  value: string | undefined = process.env.KIBI_MCP_OPTIONAL_TOOLS,
): ReadonlySet<OptionalToolName> {
  // An empty entry names no tool, so it needs no filtering.
  const requested = new Set(value?.split(",").map((entry) => entry.trim()));
  return new Set(
    OPTIONAL_TOOL_NAMES.filter(
      (name) => requested.has("all") || requested.has(name),
    ),
  );
}

/**
 * Presentation titles. The behaviour hints come from the operation effects
 * (see toolConfig), so only the tools MCP exposes need an entry here.
 */
const TOOL_TITLES: Readonly<
  Record<(typeof MCP_TOOL_ORDER)[number] | "kb_sparql_remote", string>
> = {
  kb_query: "Query Kibi entities",
  kb_search: "Search Kibi knowledge base",
  kb_status: "Inspect Kibi branch status",
  kb_skills: "Read bundled Kibi skills",
  kb_model: "Model Kibi requirement prose",
  kb_find_gaps: "Find missing Kibi relationships",
  kb_coverage: "Report Kibi coverage and proofs",
  kb_graph: "Traverse Kibi graph",
  kb_sparql_remote: "Run a remote SPARQL query",
  kb_upsert: "Create or update Kibi entities",
  kb_record: "Record a stated rule",
  kb_delete: "Delete a Kibi entity",
  kb_check: "Validate Kibi knowledge base",
  kb_review_firm_edit: "Record a firm-edit review",
  kb_prepare_impact_review: "Prepare an impact review",
  kb_compile_intent: "Compile Kibi change intent",
  kb_plan_bootstrap: "Plan Kibi bootstrap",
  kb_apply_plan: "Apply an approved Kibi plan",
  kb_ingest_proof: "Ingest proof-run evidence",
};

function exposedToolNames(
  optional: ReadonlySet<OptionalToolName>,
): readonly (keyof typeof TOOL_TITLES)[] {
  return [
    ...MCP_TOOL_ORDER,
    ...(optional.has("kb_sparql_remote")
      ? (["kb_sparql_remote"] as const)
      : []),
  ];
}

function toolConfig(name: keyof typeof TOOL_TITLES): ToolConfig {
  const spec = getSpec(name);
  const effects = spec.declaredEffects;
  const derived: ToolAnnotations = {
    readOnlyHint: effects.every((effect) => effect.mutability === "read"),
    destructiveHint: effects.some((effect) => effect.destructive),
    idempotentHint: effects.every((effect) => effect.retrySafety === "safe"),
    openWorldHint: effects.some((effect) => effect.openWorld),
  };
  return {
    name: spec.name,
    description: spec.description,
    // The full contract validates every call; hosts are shown the compact
    // form, whose stubbed fields a rejection spells out in full.
    inputSchema: advertisedInputSchema(spec.businessInputSchema),
    ...(spec.outputSchema ? { outputSchema: spec.outputSchema } : {}),
    annotations: {
      // Mutability and world-model hints are generated from the authoritative
      // operation effects; only the title is hand-authored.
      title: TOOL_TITLES[name],
      ...derived,
    },
  };
}

/** Catalog tool configs for the base list plus the given optional tools. */
export function buildBaseTools(
  optional: ReadonlySet<OptionalToolName> = enabledOptionalTools(),
): ToolConfig[] {
  return exposedToolNames(optional).map(toolConfig);
}

const BASE_TOOLS: readonly ToolConfig[] = buildBaseTools();

/**
 * Inject _diagnostic_telemetry schema into tool inputs when diagnostic mode is enabled.
 * Exported for unit coverage; TOOLS still applies it only when the server starts
 * with the --diagnostic-mode flag.
 */
export function withDiagnosticTelemetrySchema(
  tools: readonly ToolConfig[],
): ToolConfig[] {
  return tools.map((tool) => {
    const schema = tool.inputSchema;
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, unknown>)
        : {};
    return {
      ...tool,
      inputSchema: {
        ...schema,
        properties: {
          ...properties,
          _diagnostic_telemetry: DIAGNOSTIC_TELEMETRY_SCHEMA,
        },
      },
    };
  });
}

/**
 * Active tools list.
 * In diagnostic mode, all tools include the _diagnostic_telemetry parameter.
 */
export function activeTools(
  diagnosticMode: boolean = DIAGNOSTIC_MODE_ENABLED,
): ToolConfig[] {
  return withWorkspaceRootSchema(
    diagnosticMode
      ? withDiagnosticTelemetrySchema(BASE_TOOLS)
      : [...BASE_TOOLS],
  );
}

export const TOOLS: ToolConfig[] = activeTools();
