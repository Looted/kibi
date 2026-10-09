/**
 * Kibi capability-plugin protocol constants and top-level plugin shape.
 */

// implements REQ-capability-plugin-protocol-v1
export const KIBI_PLUGIN_API_VERSION = "kibi.plugin.v1" as const;
// implements REQ-capability-plugin-protocol-v1
export type KibiPluginApiVersion = typeof KIBI_PLUGIN_API_VERSION;

// implements REQ-capability-plugin-protocol-v1
export const SEMANTIC_CLASSIFIER_CAPABILITY_ID =
  "kibi.semantic-classifier.v1" as const;
// implements REQ-capability-plugin-protocol-v1
export const ONTOLOGY_PACK_CAPABILITY_ID = "kibi.ontology-pack.v1" as const;
// implements REQ-capability-plugin-protocol-v1
export const SYMBOL_EXTRACTOR_CAPABILITY_ID =
  "kibi.symbol-extractor.v1" as const;
// implements REQ-capability-plugin-protocol-v1
export const SYMBOL_EXTRACTOR_V2_CAPABILITY_ID =
  "kibi.symbol-extractor.v2" as const;

// implements REQ-kibi-vocabulary-alignment-capability
export const VOCABULARY_ALIGNMENT_CAPABILITY_ID =
  "kibi.vocabulary-alignment.v1" as const;

// implements REQ-capability-check-policy
export const CHECK_POLICY_CAPABILITY_ID = "kibi.check-policy.v1" as const;

// implements REQ-capability-plugin-protocol-v1
export type CapabilityId =
  | typeof SEMANTIC_CLASSIFIER_CAPABILITY_ID
  | typeof ONTOLOGY_PACK_CAPABILITY_ID
  | typeof SYMBOL_EXTRACTOR_CAPABILITY_ID
  | typeof SYMBOL_EXTRACTOR_V2_CAPABILITY_ID
  | typeof VOCABULARY_ALIGNMENT_CAPABILITY_ID
  | typeof CHECK_POLICY_CAPABILITY_ID;

// implements REQ-capability-plugin-protocol-v1
export const PLUGIN_MODES = ["replace", "augment", "shadow"] as const;
// implements REQ-capability-plugin-protocol-v1
export type PluginMode = (typeof PLUGIN_MODES)[number];

// implements REQ-capability-plugin-protocol-v1
export interface PluginPermissions {
  readonly network: boolean;
  readonly secrets: readonly string[];
  readonly metered: boolean;
}

// implements REQ-capability-plugin-protocol-v1
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
import type { SemanticClassifierV1 } from "./capabilities/semantic-classifier.js";
import type {
  SymbolExtractorV1,
  SymbolExtractorV2,
} from "./capabilities/symbol-extractor.js";
import type { VocabularyAlignmentV1 } from "./capabilities/vocabulary-alignment.js";

// implements REQ-capability-plugin-protocol-v1
export interface KibiPluginCapabilities {
  readonly semanticClassifier?: SemanticClassifierV1;
  readonly ontologyPack?: OntologyPackV1;
  readonly symbolExtractor?: SymbolExtractorV1;
  readonly symbolExtractorV2?: SymbolExtractorV2;
  /** Optional; plugins without it keep working unchanged. */
  readonly vocabularyAlignment?: VocabularyAlignmentV1;
  /** Declarative check policy; Kibi evaluates it, never runs it. */
  readonly checkPolicy?: CheckPolicyV1;
}

// implements REQ-capability-plugin-protocol-v1
export interface KibiPluginV1 {
  readonly apiVersion: KibiPluginApiVersion;
  readonly id: string;
  readonly version: string;
  readonly permissions: PluginPermissions;
  readonly capabilities: KibiPluginCapabilities;
}

// implements REQ-capability-plugin-protocol-v1
export type ProjectPluginCapabilityConfig = Readonly<{
  mode: PluginMode;
}>;

// implements REQ-capability-plugin-protocol-v1
export type ProjectPluginEntry = Readonly<{
  package: string;
  capabilities: Readonly<
    Partial<Record<CapabilityId, ProjectPluginCapabilityConfig>>
  >;
}>;

// implements REQ-capability-plugin-protocol-v1
export type ProjectKibiConfig = Readonly<{
  plugins?: readonly ProjectPluginEntry[];
  /** Plugins the project declined when bootstrap offered them. */
  declinedPlugins?: readonly string[];
}>;
