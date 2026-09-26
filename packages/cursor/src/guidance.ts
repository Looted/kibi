import type { McpState } from "./kb-mcp-tools.js";
import { interfaceAdvisory } from "./messages.js";
// implements REQ-cursor-kibi-plugin-v1, REQ-agent-kibi-interface-selection
import {
  isDocumentationTrackedPath,
  isMeaningfulTrackedPath,
  toRepoRelativePath,
} from "./path-policy.js";

export { resolveKibiInterface } from "./kb-mcp-tools.js";

export type GuidanceContext = {
  readonly cwd: string | undefined;
  readonly hasKibi: boolean;
  readonly mcpState: McpState;
  readonly workspaceTrusted: boolean;
  /** Requirements the edited file already owns, when the manifest knows them. */
  readonly linkedRequirementIds?: readonly string[];
};

export function readGuidance(
  filePath: string,
  context: GuidanceContext,
): string | undefined {
  if (!context.hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  const guidance = [
    "Kibi read guidance: before changing this file, discover linked knowledge through the selected MCP or CLI JSON route.",
    `Start with kb_search, then kb_query with sourceFile="${relativePath}".`,
    "Prefer Kibi facts and requirements over long inline comments for durable knowledge.",
  ];
  const advisory = interfaceAdvisory(
    context.mcpState,
    context.workspaceTrusted,
  );
  return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
}

/**
 * Guidance emitted before an edit is written.
 *
 * The post-edit and stop messages can only ask for repair once the code is
 * already changed. This is the one point where retrieval can still inform the
 * change, so it names the requirements the file already implements and asks
 * for them to be read before the edit rather than reconciled after it.
 */
export function preEditGuidance(
  filePath: string,
  context: GuidanceContext,
): string | undefined {
  if (!context.hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }
  if (isDocumentationTrackedPath(relativePath)) {
    return undefined;
  }

  const linkedRequirements = context.linkedRequirementIds ?? [];
  const guidance =
    linkedRequirements.length > 0
      ? [
          `Kibi pre-edit guidance: ${relativePath} already implements ${linkedRequirements.join(", ")}.`,
          `Read those requirements with kb_query before changing behavior here, and widen with kb_query({sourceFile:"${relativePath}"}) for scenarios and tests.`,
          "If the change contradicts an existing requirement, resolve that in Kibi before writing the edit.",
        ]
      : [
          `Kibi pre-edit guidance: ${relativePath} has no linked requirement in the symbol manifest.`,
          `Discover existing constraints with kb_search, then kb_query({sourceFile:"${relativePath}"}), before changing behavior here.`,
          "Record the requirement this change serves rather than leaving the symbol unowned.",
        ];
  const advisory = interfaceAdvisory(
    context.mcpState,
    context.workspaceTrusted,
  );
  return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
}

export function writeGuidance(
  filePath: string,
  context: GuidanceContext,
): string | undefined {
  if (!context.hasKibi) {
    return undefined;
  }

  const relativePath = toRepoRelativePath(filePath, context.cwd);
  if (!isMeaningfulTrackedPath(relativePath)) {
    return undefined;
  }

  if (isDocumentationTrackedPath(relativePath)) {
    const guidance = [
      "Kibi write guidance: keep REQ, SCEN, and TEST artifacts separate.",
      "Query before mutate. Update KB entities through kb_upsert sequentially. Run kb_check before completion.",
      "Do not read or edit `.kb/` files directly.",
    ];
    const advisory = interfaceAdvisory(
      context.mcpState,
      context.workspaceTrusted,
    );
    return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
  }

  // Retrieval is asked for before the edit; this message stays scoped to the
  // impact review that only becomes possible once the change exists.
  const guidance = [
    `Kibi impact review: run kb_check({sourceFiles:["${relativePath}"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) while this edit is fresh.`,
    "Check symbol granularity and whether linked requirements, scenarios, and tests still cover the changed behavior.",
    "Prefer symbol manifest + executable_for or // implements REQ-xxx for traceability.",
  ];
  const advisory = interfaceAdvisory(
    context.mcpState,
    context.workspaceTrusted,
  );
  return advisory ? [advisory, ...guidance].join("\n") : guidance.join("\n");
}
