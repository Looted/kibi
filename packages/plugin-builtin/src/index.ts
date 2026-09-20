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
  KIBI_PLUGIN_API_VERSION,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import { createBuiltinOntologyPack } from "./ontology/builtin-ontology-pack.js";
import { createBuiltinSemanticClassifier } from "./semantic/builtin-classifier.js";
import { createBuiltinTsMorphSymbolExtractor } from "./symbols/ts-morph-extractor.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

// implements REQ-capability-plugin-builtin-parity-v1
export { createBuiltinOntologyPack } from "./ontology/builtin-ontology-pack.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  BuiltinOntologyPack,
  BUILTIN_PREDICATE_RULE_SETS,
} from "./ontology/builtin-ontology-pack.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  detectPredicateRules,
  schemaIdFor,
  type PredicateRule,
} from "./ontology/predicate-rule.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
  commaList,
} from "./ontology/normalize.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  createBuiltinSemanticClassifier,
  BuiltinSemanticClassifier,
  detectSignals,
  chooseLane,
} from "./semantic/builtin-classifier.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSourceAnalysisProvider,
} from "./symbols/ts-morph-extractor.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  enrichSymbolCoordinatesWithTsMorph,
  type ManifestSymbolEntry,
  type SymbolCoordinates,
} from "./symbols/ts-morph-enrichment.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  collectGranularityCandidates,
  type GranularitySymbolCandidate,
} from "./symbols/ts-morph-granularity.js";
// implements REQ-capability-plugin-builtin-parity-v1
export {
  isPrivateClassMember,
  onlyCandidate,
} from "./symbols/ts-morph-shared.js";

/**
 * Default Kibi capability plugin.
 */
// implements REQ-capability-plugin-builtin-parity-v1
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
  },
});

// implements REQ-capability-plugin-builtin-parity-v1
export default kibiPlugin;
