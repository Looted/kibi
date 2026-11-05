import path from "node:path";

import type { ProjectKibiConfig, ProjectPluginEntry } from "kibi-plugin-sdk";
import { REFERENCE_PLUGIN_PACKAGE } from "../../plugins/proof-reference-extractors.js";
import {
  describeReferenceLanguageSuggestion,
  manifestDeclares,
  pinnedPackVersions,
  referenceLanguageSuggestion,
  workspaceInstalledVersion,
  workspacePackRelevance,
} from "../../plugins/reference-language-suggestion.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import {
  PLUGIN_LANGUAGE_PACKS,
  pluginReferenceLanguage,
} from "../proof/code-languages.js";

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

/**
 * The project's kibi block as written, for offers that look at capabilities.
 * `kibi` is the block itself, already known to be a mapping.
 */
function kibiConfigOf(
  kibi: Record<string, unknown>,
): ProjectKibiConfig &
  Required<Pick<ProjectKibiConfig, "plugins" | "declinedPlugins">> {
  const { plugins, declinedPlugins, declinedLanguagePacks, generatedPaths } =
    kibi;
  return {
    plugins: Array.isArray(plugins)
      ? plugins.flatMap((entry) => {
          // Scalar entries have no fields, so only null needs care.
          const { package: name, capabilities } = (entry ?? {}) as Record<
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
    // A non-string entry names no pack and matches no path, so these lists
    // are passed on as written; a value that is not a list is ignored.
    ...(Array.isArray(declinedLanguagePacks) ? { declinedLanguagePacks } : {}),
    ...(Array.isArray(generatedPaths) ? { generatedPaths } : {}),
  };
}

/** The workspace's package.json, or undefined when it cannot be read. */
async function readManifest(context: OperationContext): Promise<unknown> {
  try {
    // A context without file access throws here, as a missing file does.
    return JSON.parse(
      await (context.fs as NonNullable<OperationContext["fs"]>).readFile(
        path.join(context.workspaceRoot, "package.json"),
      ),
    );
  } catch {
    // No readable package.json.
  }
  return undefined;
}

/** Requirement documents already in the KB lane. */
async function requirementFiles(
  context: OperationContext,
): Promise<readonly string[]> {
  try {
    // A context without file access or glob throws here and lists none.
    return [
      ...(await (
        context.fs as Required<NonNullable<OperationContext["fs"]>>
      ).glob([`${KB_PATHS.lanes.requirements}/**/*.md`], {
        cwd: context.workspaceRoot,
      })),
    ].sort();
  } catch {
    // rationale: a failed listing and a one-entry placeholder both stay below
    // SEARCH_HINTS_OFFER_REQUIREMENTS, so no offer can tell them apart.
    // Stryker disable next-line ArrayDeclaration
    return [];
  }
}

/**
 * Optional plugins worth offering for this workspace. kibi-plugin-ui is
 * offered when production React or Angular component files exist, and
 * kibi-plugin-search-hints once the KB holds enough requirements that a
 * question worded differently from them is likely to miss; neither is
 * offered once the project activated or declined it. kibi-plugin-treesitter
 * is offered for sources in any language it reads until it is listed, and
 * for Go, Java, C#, Rust, PHP, C, Bash and Terraform sources until it is active
 * for source proofs.
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
  // Any language the plugin reads (for symbols, or for proofs too).
  const wantsReferences = files.some(
    (file) =>
      pluginReferenceLanguage(file) !== null ||
      PLUGIN_LANGUAGE_PACKS.some((language) => language.pattern.test(file)),
  );
  if (uiFiles.length === 0 && !wantsHints && !wantsReferences) return [];
  const manifest = await readManifest(context);
  // Scalar manifests have no fields, so only null needs care.
  const kibi = (manifest as { kibi?: unknown } | null | undefined)?.kibi;
  // A malformed kibi block is reported by every other operation; offering a
  // plugin into it would only add noise.
  if (
    kibi !== undefined &&
    (typeof kibi !== "object" || kibi === null || Array.isArray(kibi))
  )
    return [];
  const config = kibiConfigOf((kibi ?? {}) as Record<string, unknown>);
  // Plugins the project activated or declined.
  const configured = new Set([
    ...config.plugins.map((entry) => entry.package),
    ...config.declinedPlugins,
  ]);
  const offers: PluginOffer[] = [];
  const references = wantsReferences
    ? referenceLanguageSuggestion(
        files,
        config,
        workspaceInstalledVersion(context.workspaceRoot),
        pinnedPackVersions(context.workspaceRoot),
        undefined,
        manifestDeclares(manifest, REFERENCE_PLUGIN_PACKAGE),
        workspacePackRelevance(context.workspaceRoot, files, config),
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
