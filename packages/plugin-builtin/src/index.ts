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

import { createRequire } from "node:module";
import {
  CHECK_POLICY_CONTRACT_VERSION,
  KIBI_PLUGIN_API_VERSION,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import { createBuiltinOntologyPack } from "./ontology/builtin-ontology-pack.js";
import { createBuiltinSemanticClassifier } from "./semantic/builtin-classifier.js";
import {
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSymbolExtractorV2,
} from "./symbols/ts-morph-extractor.js";
import { createBuiltinVocabularyAlignment } from "./vocabulary/builtin-vocabulary-alignment.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

export { createBuiltinOntologyPack } from "./ontology/builtin-ontology-pack.js";
export {
  BuiltinOntologyPack,
  BUILTIN_PREDICATE_RULE_SETS,
} from "./ontology/builtin-ontology-pack.js";
export {
  detectPredicateRules,
  schemaIdFor,
  type PredicateRule,
} from "./ontology/predicate-rule.js";
export { CORE_PREDICATE_RULES } from "./ontology/predicate-rules-core.js";
export {
  LAUNCHER_PREDICATE_RULES,
  exactLauncherPredicateArgs,
} from "./ontology/predicate-rules-launcher.js";
export { POLICY_PREDICATE_RULES } from "./ontology/predicate-rules-policy.js";
export { PRODUCT_PREDICATE_RULES } from "./ontology/predicate-rules-product.js";
export { PRODUCT_TAIL_PREDICATE_RULES } from "./ontology/predicate-rules-product-tail.js";
export {
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  commaList,
} from "./ontology/normalize.js";
export {
  createBuiltinSemanticClassifier,
  BuiltinSemanticClassifier,
  detectSignals,
  chooseLane,
} from "./semantic/builtin-classifier.js";
export {
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSymbolExtractorV2,
  createBuiltinTsMorphSourceAnalysisProvider,
} from "./symbols/ts-morph-extractor.js";
export {
  enrichSymbolCoordinatesWithTsMorph,
  type ManifestSymbolEntry,
  type SymbolCoordinates,
} from "./symbols/ts-morph-enrichment.js";
export {
  collectGranularityCandidates,
  type GranularitySymbolCandidate,
} from "./symbols/ts-morph-granularity.js";
export {
  isPrivateClassMember,
  onlyCandidate,
} from "./symbols/ts-morph-shared.js";

export {
  BUILTIN_CLAIM_SIMILARITY_THRESHOLD,
  BUILTIN_SUBJECT_REUSE_THRESHOLD,
  BuiltinVocabularyAlignment,
  builtinSubjectDecision,
  claimSimilarity,
  createBuiltinVocabularyAlignment,
  rankSubjectCandidates,
  vocabularyTokens,
  type SubjectVocabularyEntry,
} from "./vocabulary/builtin-vocabulary-alignment.js";

/**
 * Default Kibi capability plugin.
 */
export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "kibi-plugin-builtin",
  version: packageJson.version,
  permissions: {
    network: false,
    metered: false,
    secrets: [],
  },
  capabilities: {
    semanticClassifier: createBuiltinSemanticClassifier(),
    ontologyPack: createBuiltinOntologyPack(),
    symbolExtractor: createBuiltinTsMorphSymbolExtractor(),
    symbolExtractorV2: createBuiltinTsMorphSymbolExtractorV2(),
    vocabularyAlignment: createBuiltinVocabularyAlignment(),
    // Kibi's own rules live in core; the builtin adds no check policy.
    checkPolicy: {
      id: "kibi-plugin-builtin.check-policy",
      document: {
        contractVersion: CHECK_POLICY_CONTRACT_VERSION,
        id: "builtin",
        title: "Builtin (no additional rules)",
      },
    },
  },
});

export default kibiPlugin;
