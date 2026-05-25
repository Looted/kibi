import { createHash } from "node:crypto";
import {
  type SkillManifest,
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
} from "kibi-cli/skills";

type TextContent = Array<{ type: string; text: string }>;

export type SkillsListArgs = Record<string, never>;

export interface SkillsListResult {
  content: TextContent;
  structuredContent?: { skills: SkillManifest[] };
}

export interface SkillsLoadArgs {
  id: string;
}

export interface SkillsLoadPayload {
  metadata: SkillManifest;
  body: string;
  resources: string[];
  contentHash: string;
  sourceType: "bundled";
}

export interface SkillsLoadResult {
  content: TextContent;
  structuredContent?: SkillsLoadPayload;
}

export interface SkillsReadArgs {
  id: string;
  resource: string;
}

export interface SkillsReadResult {
  content: TextContent;
  structuredContent?: { content: string };
}

// implements REQ-001
export async function handleKbSkillsList(
  _args: SkillsListArgs,
): Promise<SkillsListResult> {
  try {
    const skills = listBundledSkills();
    const ids = skills.map((skill) => skill.id).join(", ") || "none";
    return {
      content: [{ type: "text", text: `Found ${skills.length} bundled skills: ${ids}` }],
      structuredContent: { skills },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Skills list failed: ${message}`);
  }
}

// implements REQ-001
export async function handleKbSkillsLoad(
  args: SkillsLoadArgs,
): Promise<SkillsLoadResult> {
  try {
    assertNonEmptyString(args.id, "id");
    const bundle = loadBundledSkill(args.id);
    const resources = bundle.manifest.resources ?? [];
    const payload: SkillsLoadPayload = {
      metadata: bundle.manifest,
      body: bundle.body,
      resources,
      contentHash: createHash("sha256").update(bundle.body, "utf8").digest("hex"),
      sourceType: "bundled",
    };

    return {
      content: [
        {
          type: "text",
          text: `Loaded bundled skill ${bundle.manifest.id} with ${resources.length} resources`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Skills load failed: ${message}`);
  }
}

// implements REQ-001
export async function handleKbSkillsRead(
  args: SkillsReadArgs,
): Promise<SkillsReadResult> {
  try {
    assertNonEmptyString(args.id, "id");
    assertNonEmptyString(args.resource, "resource");
    const resourceContent = readBundledSkillResource(args.id, args.resource);
    return {
      content: [
        {
          type: "text",
          text: `Read bundled skill resource ${args.id}/${args.resource}`,
        },
      ],
      structuredContent: { content: resourceContent },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Skills read failed: ${message}`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
}
