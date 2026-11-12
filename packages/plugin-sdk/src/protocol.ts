/**
 * Kibi capability-plugin protocol constants and top-level plugin shape.
 */

export const KIBI_PLUGIN_API_VERSION = "kibi.plugin.v1" as const;
export type KibiPluginApiVersion = typeof KIBI_PLUGIN_API_VERSION;

export const SEMANTIC_CLASSIFIER_CAPABILITY_ID =
  "kibi.semantic-classifier.v1" as const;
export const ONTOLOGY_PACK_CAPABILITY_ID = "kibi.ontology-pack.v1" as const;
export const SYMBOL_EXTRACTOR_CAPABILITY_ID =
  "kibi.symbol-extractor.v1" as const;
export const SYMBOL_EXTRACTOR_V2_CAPABILITY_ID =
  "kibi.symbol-extractor.v2" as const;

export const VOCABULARY_ALIGNMENT_CAPABILITY_ID =
  "kibi.vocabulary-alignment.v1" as const;

export const CHECK_POLICY_CAPABILITY_ID = "kibi.check-policy.v1" as const;

export const SEARCH_HINTS_CAPABILITY_ID = "kibi.search-hints.v1" as const;

export const REFERENCE_EXTRACTOR_CAPABILITY_ID =
  "kibi.reference-extractor.v1" as const;

export type CapabilityId =
  | typeof SEMANTIC_CLASSIFIER_CAPABILITY_ID
  | typeof ONTOLOGY_PACK_CAPABILITY_ID
  | typeof SYMBOL_EXTRACTOR_CAPABILITY_ID
  | typeof SYMBOL_EXTRACTOR_V2_CAPABILITY_ID
  | typeof VOCABULARY_ALIGNMENT_CAPABILITY_ID
  | typeof CHECK_POLICY_CAPABILITY_ID
  | typeof SEARCH_HINTS_CAPABILITY_ID
  | typeof REFERENCE_EXTRACTOR_CAPABILITY_ID;

export const PLUGIN_MODES = ["replace", "augment", "shadow"] as const;
export type PluginMode = (typeof PLUGIN_MODES)[number];

export interface PluginPermissions {
  readonly network: boolean;
  readonly secrets: readonly string[];
  readonly metered: boolean;
}

export interface PluginProviderStamp {
  readonly pluginId: string;
  readonly pluginVersion: string;
  readonly capability: CapabilityId;
  readonly mode: PluginMode;
  readonly external: boolean;
  readonly network: boolean;
  readonly metered: boolean;
  readonly fallbackUsed?: boolean;
  /** Effective provider model when the capability discloses one. */
  readonly model?: string;
}

import type { CheckPolicyV1 } from "./capabilities/check-policy.js";
import type { OntologyPackV1 } from "./capabilities/ontology-pack.js";
import type { ReferenceExtractorV1 } from "./capabilities/reference-extractor.js";
import type { SearchHintsV1 } from "./capabilities/search-hints.js";
import type { SemanticClassifierV1 } from "./capabilities/semantic-classifier.js";
import type {
  SymbolExtractorV1,
  SymbolExtractorV2,
} from "./capabilities/symbol-extractor.js";
import type { VocabularyAlignmentV1 } from "./capabilities/vocabulary-alignment.js";

export interface KibiPluginCapabilities {
  readonly semanticClassifier?: SemanticClassifierV1;
  readonly ontologyPack?: OntologyPackV1;
  readonly symbolExtractor?: SymbolExtractorV1;
  readonly symbolExtractorV2?: SymbolExtractorV2;
  /** Optional; plugins without it keep working unchanged. */
  readonly vocabularyAlignment?: VocabularyAlignmentV1;
  /** Declarative check policy; Kibi evaluates it, never runs it. */
  readonly checkPolicy?: CheckPolicyV1;
  /** Advisory hints for a weak search answer; never changes results. */
  readonly searchHints?: SearchHintsV1;
  /** What a source file references, read without running it (source proofs). */
  readonly referenceExtractor?: ReferenceExtractorV1;
}

export interface KibiPluginV1 {
  readonly apiVersion: KibiPluginApiVersion;
  readonly id: string;
  readonly version: string;
  readonly permissions: PluginPermissions;
  readonly capabilities: KibiPluginCapabilities;
}

export type ProjectPluginCapabilityConfig = Readonly<{
  mode: PluginMode;
}>;

export type ProjectPluginEntry = Readonly<{
  package: string;
  capabilities: Readonly<
    Partial<Record<CapabilityId, ProjectPluginCapabilityConfig>>
  >;
}>;

export type ProjectKibiConfig = Readonly<{
  plugins?: readonly ProjectPluginEntry[];
  /** Plugins the project declined when bootstrap offered them. */
  declinedPlugins?: readonly string[];
  /**
   * kibi-lang-* grammar packs the project does not want. Kibi stops
   * suggesting them, and a source file in their language is treated as one
   * no installed plugin reads (a whole-file review) instead of blocking.
   */
  declinedLanguagePacks?: readonly string[];
  /**
   * Gitignore-style globs of files a tool generates, on top of
   * `.gitattributes` and generator headers; a `!` pattern marks a path as
   * hand-written. Generated files do not ask for grammar packs and their
   * symbols need no requirement link unless the KB references the file.
   */
  generatedPaths?: readonly string[];
}>;
