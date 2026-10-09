import path from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";

/** An optional plugin bootstrap offers because the workspace looks like it fits. */
// implements REQ-bootstrap-ui-plugin-offer
export type PluginOffer = {
  readonly package: string;
  readonly capability: string;
  readonly reason: string;
  readonly fileCount: number;
  readonly evidence: readonly string[];
};

const UI_PLUGIN = "kibi-plugin-ui";
const UI_CAPABILITY = "kibi.check-policy.v1";
const UI_SOURCE = /(?:\.(?:tsx|jsx)|\.component\.ts)$/i;
const NOT_PRODUCTION =
  /(?:^|\/)(?:node_modules|dist|build|coverage|tests?|__tests__|e2e)\/|\.(?:test|spec|stories)\.[^/]+$/i;
const EVIDENCE_LIMIT = 5;

/** Plugin names the project activated or declined, from its package.json. */
async function configuredPlugins(
  context: OperationContext,
): Promise<ReadonlySet<string> | undefined> {
  let manifest: unknown;
  try {
    if (!context.fs) return new Set();
    manifest = JSON.parse(
      await context.fs.readFile(
        path.join(context.workspaceRoot, "package.json"),
      ),
    );
  } catch {
    // No package.json: nothing declined yet, so the offer stands.
    return new Set();
  }
  if (typeof manifest !== "object" || manifest === null) return new Set();
  const kibi = (manifest as Record<string, unknown>).kibi;
  if (kibi === undefined) return new Set();
  if (typeof kibi !== "object" || kibi === null || Array.isArray(kibi))
    // A malformed kibi block is reported by every other operation; offering
    // a plugin into it would only add noise.
    return undefined;
  const { plugins, declinedPlugins } = kibi as Record<string, unknown>;
  const names = new Set<string>();
  if (Array.isArray(plugins))
    for (const entry of plugins) {
      const name =
        typeof entry === "object" && entry !== null
          ? (entry as Record<string, unknown>).package
          : undefined;
      if (typeof name === "string") names.add(name);
    }
  if (Array.isArray(declinedPlugins))
    for (const name of declinedPlugins)
      if (typeof name === "string") names.add(name);
  return names;
}

/**
 * Optional plugins worth offering for this workspace. kibi-plugin-ui is
 * offered when production React or Angular component files exist and the
 * project has neither activated nor declined it.
 */
// implements REQ-bootstrap-ui-plugin-offer
export async function pluginOffers(
  context: OperationContext,
  files: readonly string[],
): Promise<readonly PluginOffer[]> {
  const uiFiles = files.filter(
    (file) => UI_SOURCE.test(file) && !NOT_PRODUCTION.test(file),
  );
  if (uiFiles.length === 0) return [];
  const configured = await configuredPlugins(context);
  if (configured === undefined || configured.has(UI_PLUGIN)) return [];
  return [
    {
      package: UI_PLUGIN,
      capability: UI_CAPABILITY,
      reason: `${uiFiles.length} UI component file(s) found`,
      fileCount: uiFiles.length,
      evidence: uiFiles.slice(0, EVIDENCE_LIMIT),
    },
  ];
}
