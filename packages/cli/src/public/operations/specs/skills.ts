import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

export const skillsListSpec = {
  name: "kb_skills_list",
  cliName: "skills list",
  description:
    "List bundled Kibi agent skills available for progressive disclosure. Read-only; does not mutate the KB or require Prolog.",
  businessInputSchema: { type: "object", properties: {} },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executePlaceholder,
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
  execute: executePlaceholder,
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
      id: { type: "string", description: "Bundled skill ID. Example: 'kibi-usage'." },
      resource: {
        type: "string",
        description:
          "Manifest-declared resource path to read. Example: 'resources/workflows.md'.",
      },
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
