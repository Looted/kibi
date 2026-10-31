import path from "node:path";

import type { ProjectKibiConfig, ProjectPluginEntry } from "kibi-plugin-sdk";
import {
  describeReferenceLanguageSuggestion,
  pinnedPackVersions,
  referenceLanguageSuggestion,
  workspaceInstalledVersion,
} from "../../plugins/reference-language-suggestion.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import { pluginReferenceLanguage } from "../proof/code-languages.js";

/** An optional plugin bootstrap offers because the workspace looks like it fits. */
// implements REQ-bootstrap-ui-plugin-offer
export type PluginOffer = {
  readonly package: string;
  readonly capability: string;
  /** The mode to activate the capability in. */
  readonly mode: "augment" | "replace";
  readonly reason: string;
  readonly fileCount: number;
  readonly evidence: readonly string[];
  /** Further capabilities of the same package to activate, with their modes. */
  readonly alsoActivate?: Readonly<Record<string, "augment" | "replace">>;
  /** Data packages to install next to it, such as kibi-lang-* grammar packs. */
  readonly alsoInstall?: readonly string[];
};

const UI_PLUGIN = "kibi-plugin-ui";
const UI_CAPABILITY = "kibi.check-policy.v1";
const UI_SOURCE = /(?:\.(?:tsx|jsx)|\.component\.ts)$/i;
const NOT_PRODUCTION =
  /(?:^|\/)(?:node_modules|dist|build|coverage|tests?|__tests__|e2e)\/|\.(?:test|spec|stories)\.[^/]+$/i;
const EVIDENCE_LIMIT = 5;
const HINTS_PLUGIN = "kibi-plugin-search-hints";
const HINTS_CAPABILITY = "kibi.search-hints.v1";
/**
 * Below this many requirements a reader can scan the list, and a question
 * worded unlike the KB rarely misses; above it hints start to pay.
 */
// implements REQ-kibi-plugin-search-hints
export const SEARCH_HINTS_OFFER_REQUIREMENTS = 50;

/** The project's kibi block as written, for offers that look at capabilities. */
function kibiConfigOf(manifest: unknown): ProjectKibiConfig {
  if (typeof manifest !== "object" || manifest === null) return {};
  const kibi = (manifest as Record<string, unknown>).kibi;
  if (typeof kibi !== "object" || kibi === null || Array.isArray(kibi))
    return {};
  const { plugins, declinedPlugins } = kibi as Record<string, unknown>;
  return {
    plugins: Array.isArray(plugins)
      ? plugins.flatMap((entry) => {
          if (typeof entry !== "object" || entry === null) return [];
          const { package: name, capabilities } = entry as Record<
            string,
            unknown
          >;
          return typeof name === "string"
            ? [
                {
                  package: name,
                  capabilities:
                    typeof capabilities === "object" && capabilities !== null
                      ? (capabilities as ProjectPluginEntry["capabilities"])
                      : {},
                },
              ]
            : [];
        })
      : [],
    declinedPlugins: Array.isArray(declinedPlugins)
      ? declinedPlugins.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
  };
}

async function readManifest(context: OperationContext): Promise<unknown> {
  try {
    if (!context.fs) return undefined;
    return JSON.parse(
      await context.fs.readFile(
        path.join(context.workspaceRoot, "package.json"),
      ),
    );
  } catch {
    return undefined;
  }
}

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

/** Requirement documents already in the KB lane. */
async function requirementFiles(
  context: OperationContext,
): Promise<readonly string[]> {
  if (!context.fs?.glob) return [];
  try {
    return [
      ...(await context.fs.glob([`${KB_PATHS.lanes.requirements}/**/*.md`], {
        cwd: context.workspaceRoot,
      })),
    ].sort();
  } catch {
    return [];
  }
}

/**
 * Optional plugins worth offering for this workspace. kibi-plugin-ui is
 * offered when production React or Angular component files exist, and
 * kibi-plugin-search-hints once the KB holds enough requirements that a
 * question worded differently from them is likely to miss; neither is
 * offered once the project activated or declined it. kibi-plugin-treesitter
 * is offered for Go, Java, C# and Rust sources until it is active for
 * source proofs.
 */
// implements REQ-bootstrap-ui-plugin-offer, REQ-kibi-plugin-search-hints, REQ-kibi-tree-sitter-references
export async function pluginOffers(
  context: OperationContext,
  files: readonly string[],
): Promise<readonly PluginOffer[]> {
  const uiFiles = files.filter(
    (file) => UI_SOURCE.test(file) && !NOT_PRODUCTION.test(file),
  );
  const requirements = await requirementFiles(context);
  const wantsHints = requirements.length >= SEARCH_HINTS_OFFER_REQUIREMENTS;
  const wantsReferences = files.some(
    (file) => pluginReferenceLanguage(file) !== null,
  );
  if (uiFiles.length === 0 && !wantsHints && !wantsReferences) return [];
  const configured = await configuredPlugins(context);
  if (configured === undefined) return [];
  const offers: PluginOffer[] = [];
  const references = wantsReferences
    ? referenceLanguageSuggestion(
        files,
        kibiConfigOf(await readManifest(context)),
        workspaceInstalledVersion(context.workspaceRoot),
        pinnedPackVersions(context.workspaceRoot),
      )
    : null;
  if (references !== null && references.capabilities.length > 0) {
    const [capability, ...more] = references.capabilities;
    offers.push({
      package: references.package,
      capability: capability as string,
      mode: "augment",
      reason: describeReferenceLanguageSuggestion(references),
      fileCount: references.languages.reduce(
        (total, language) => total + language.files,
        0,
      ),
      evidence: references.evidence,
      ...(references.packs.length > 0 ? { alsoInstall: references.packs } : {}),
      ...(more.length > 0
        ? {
            alsoActivate: Object.fromEntries(
              more.map((name) => [name, "augment" as const]),
            ),
          }
        : {}),
    });
  }
  if (uiFiles.length > 0 && !configured.has(UI_PLUGIN))
    offers.push({
      package: UI_PLUGIN,
      capability: UI_CAPABILITY,
      mode: "augment",
      reason: `${uiFiles.length} UI component file(s) found`,
      fileCount: uiFiles.length,
      evidence: uiFiles.slice(0, EVIDENCE_LIMIT),
    });
  if (wantsHints && !configured.has(HINTS_PLUGIN))
    offers.push({
      package: HINTS_PLUGIN,
      capability: HINTS_CAPABILITY,
      mode: "replace",
      reason: `${requirements.length} requirements in the KB; kb_search can suggest which ones a weakly answered question means`,
      fileCount: requirements.length,
      evidence: requirements.slice(0, EVIDENCE_LIMIT),
    });
  return offers;
}
