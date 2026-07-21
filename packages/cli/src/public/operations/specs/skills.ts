import { createHash } from "node:crypto";
import {
  type SkillManifest,
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
} from "../../skills.js";
import type { OperationContext } from "../runtime-types.js";
import type { OperationResult, OperationSpec } from "../types.js";

function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
}

async function executeSkillsList(
  _input: Readonly<Record<string, unknown>>,
  _context: OperationContext,
): Promise<OperationResult<{ readonly skills: readonly SkillManifest[] }>> {
  const skills = listBundledSkills();
  const ids = skills.map((skill) => skill.id).join(", ") || "none";
  return {
    content: [
      { type: "text", text: `Found ${skills.length} bundled skills: ${ids}` },
    ],
    structuredContent: { skills },
  };
}

async function executeSkillsLoad(
  input: Readonly<Record<string, unknown>>,
  _context: OperationContext,
): Promise<
  OperationResult<{
    readonly metadata: SkillManifest;
    readonly body: string;
    readonly resources: readonly string[];
    readonly contentHash: string;
    readonly sourceType: "bundled";
  }>
> {
  const id = typeof input.id === "string" ? input.id : "";
  assertNonEmptyString(id, "id");
  const bundle = loadBundledSkill(id);
  const resources = bundle.manifest.resources ?? [];
  const contentHash = createHash("sha256")
    .update(bundle.body, "utf8")
    .digest("hex");
  const resourceList = resources.length === 0 ? "none" : resources.join(", ");
  return {
    content: [
      {
        type: "text",
        text: `Loaded bundled skill ${bundle.manifest.id} with ${resources.length} resources: ${resourceList}`,
      },
    ],
    structuredContent: {
      metadata: bundle.manifest,
      body: bundle.body,
      resources,
      contentHash,
      sourceType: "bundled",
    },
  };
}

async function executeSkillsRead(
  input: Readonly<Record<string, unknown>>,
  _context: OperationContext,
): Promise<OperationResult<{ readonly content: string }>> {
  const id = typeof input.id === "string" ? input.id : "";
  const resource = typeof input.resource === "string" ? input.resource : "";
  assertNonEmptyString(id, "id");
  assertNonEmptyString(resource, "resource");
  const resourceContent = readBundledSkillResource(id, resource);
  return {
    content: [
      {
        type: "text",
        text: `Read bundled skill resource ${id}/${resource}`,
      },
    ],
    structuredContent: { content: resourceContent },
  };
}

export const skillsListSpec = {
  name: "kb_skills_list",
  cliName: "skills list",
  description:
    "List bundled Kibi agent skills available for progressive disclosure. Read-only; does not mutate the KB or require Prolog.",
  businessInputSchema: { type: "object", properties: {} },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executeSkillsList,
} as const satisfies OperationSpec;

export const skillsLoadSpec = {
  name: "kb_skills_load",
  cliName: "skills load",
  description:
    "Load a bundled Kibi agent skill by ID, returning its manifest metadata, Markdown body, declared resources, content hash, and source type. Read-only; does not execute scripts or require Prolog.",
  businessInputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
        description: "Bundled skill ID to load. Example: 'kibi-usage'.",
      },
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executeSkillsLoad,
} as const satisfies OperationSpec;

export const skillsReadSpec = {
  name: "kb_skills_read",
  cliName: "skills read",
  description:
    "Read a declared resource from a bundled Kibi agent skill. Resource paths are restricted to the skill manifest; arbitrary file paths are not exposed. Read-only; does not require Prolog.",
  businessInputSchema: {
    type: "object",
    required: ["id", "resource"],
    properties: {
      id: {
        type: "string",
        description: "Bundled skill ID. Example: 'kibi-usage'.",
      },
      resource: {
        type: "string",
        description:
          "Manifest-declared resource path to read. Example: 'resources/workflows.md'.",
      },
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executeSkillsRead,
} as const satisfies OperationSpec;
