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

// implements REQ-capability-plugin-activation-disclosure-v1
export {
  readProjectKibiConfig,
  readProjectPackageJson,
  type ProjectPackageManifest,
} from "./project-config.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  PluginResolutionError,
  PluginValidationError,
  assertBarePackageName,
  hasConsumerNodeModulesLink,
  hasDeclaredProjectDependency,
  isBarePackageName,
  isProjectScopedPackage,
  packageJsonForResolvedFile,
  resolveProjectLocalPackage,
  type ResolvedProjectPackage,
} from "./resolve-package.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  loadPluginPackage,
  type LoadPluginOptions,
  type LoadedPlugin,
} from "./load-plugin.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  CapabilityRegistry,
  CapabilityRegistryCache,
  createCapabilityRegistry,
  createCapabilityRegistryCache,
  createStubBuiltinPlugin,
  ensureCapabilityRegistry,
  type BuiltinPluginFactory,
  type CapabilityModeResolution,
  type CapabilityProviderBinding,
  type CapabilityRegistryOptions,
  type EnsureCapabilityRegistryOptions,
} from "./registry.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  composeSemanticClassification,
  type ComposedSemanticClassifierResult,
} from "./compose-semantic-classifier.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  composeOntologyCatalog,
  composeOntologyMatches,
  type ComposedOntologyCatalog,
  type StampedOntologyCandidate,
} from "./compose-ontology-packs.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  SourceAnalysisService,
  analyzeWithResolution,
  createConservativeFallbackAnalysis,
  createSourceAnalysisService,
  type HostSourceAnalysisResult,
  type SourceAnalysisServiceOptions,
} from "./source-analysis-service.js";
// implements REQ-capability-plugin-activation-disclosure-v1
export {
  EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS,
  allowsExternalSemanticClassifier,
  type ExternalSemanticClassifierOperation,
} from "./external-allowlist.js";
