import {
  ONTOLOGY_POLARITIES,
  type OntologyMatchCandidate,
  type OntologyPackV1,
  type PredicateSchemaDefinition,
} from "./capabilities/ontology-pack.js";
import {
  SEMANTIC_LANES,
  SEMANTIC_SIGNAL_KINDS,
  type SemanticClassificationDecision,
  type SemanticClassifierResult,
  type SemanticClassifierV1,
  type SemanticSignalKind,
} from "./capabilities/semantic-classifier.js";
import type {
  SourceAnalysisResult,
  SourceSymbolKind,
  SymbolExtractorV1,
} from "./capabilities/symbol-extractor.js";
import {
  type CapabilityId,
  KIBI_PLUGIN_API_VERSION,
  type KibiPluginV1,
  ONTOLOGY_PACK_CAPABILITY_ID,
  PLUGIN_MODES,
  type PluginMode,
  type PluginPermissions,
  type ProjectKibiConfig,
  type ProjectPluginEntry,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
} from "./protocol.js";

const SOURCE_SYMBOL_KINDS = [
  "function",
  "class",
  "method",
  "property",
  "accessor",
  "interface",
  "type",
  "enum",
  "variable",
  "unknown",
] as const satisfies readonly SourceSymbolKind[];

// implements REQ-capability-plugin-protocol-v1
export class PluginValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PluginValidationError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  field: string,
  code = "INVALID_PLUGIN",
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PluginValidationError(
      code,
      `${field} must be a non-empty string`,
    );
  }
  return value.trim();
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new PluginValidationError(
      "INVALID_PERMISSIONS",
      `${field} must be a boolean`,
    );
  }
  return value;
}

function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      `${field} must be a finite number`,
    );
  }
  return value;
}

// implements REQ-capability-plugin-protocol-v1
export function isCapabilityId(value: string): value is CapabilityId {
  return (
    value === SEMANTIC_CLASSIFIER_CAPABILITY_ID ||
    value === ONTOLOGY_PACK_CAPABILITY_ID ||
    value === SYMBOL_EXTRACTOR_CAPABILITY_ID
  );
}

// implements REQ-capability-plugin-protocol-v1
export function isPluginMode(value: string): value is PluginMode {
  return (PLUGIN_MODES as readonly string[]).includes(value);
}

// implements REQ-capability-plugin-protocol-v1
export function validatePermissions(value: unknown): PluginPermissions {
  if (!isRecord(value)) {
    throw new PluginValidationError(
      "INVALID_PERMISSIONS",
      "permissions must be an object",
    );
  }
  const network = requireBoolean(value.network, "permissions.network");
  const metered = requireBoolean(value.metered, "permissions.metered");
  if (!Array.isArray(value.secrets)) {
    throw new PluginValidationError(
      "INVALID_PERMISSIONS",
      "permissions.secrets must be an array of secret names",
    );
  }
  const secrets = value.secrets.map((entry, index) =>
    requireString(
      entry,
      `permissions.secrets[${index}]`,
      "INVALID_PERMISSIONS",
    ),
  );
  if (new Set(secrets).size !== secrets.length) {
    throw new PluginValidationError(
      "INVALID_PERMISSIONS",
      "permissions.secrets must not contain duplicate names",
    );
  }
  return { network, metered, secrets };
}

function validateSemanticClassifier(value: unknown): SemanticClassifierV1 {
  if (!isRecord(value) || typeof value.classify !== "function") {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "semanticClassifier must expose classify()",
    );
  }
  const model = optionalClassifierModel(value.model);
  return {
    id: requireString(value.id, "semanticClassifier.id", "INVALID_CAPABILITY"),
    classify: value.classify as SemanticClassifierV1["classify"],
    ...(model !== undefined ? { model } : {}),
  };
}

// implements REQ-capability-plugin-protocol-v1
function optionalClassifierModel(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "semanticClassifier.model must be a non-empty string when provided",
    );
  }
  return value.trim();
}

function validateOntologyPack(value: unknown): OntologyPackV1 {
  if (
    !isRecord(value) ||
    typeof value.schemas !== "function" ||
    typeof value.match !== "function"
  ) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "ontologyPack must expose schemas() and match()",
    );
  }
  return {
    id: requireString(value.id, "ontologyPack.id", "INVALID_CAPABILITY"),
    schemas: value.schemas as OntologyPackV1["schemas"],
    match: value.match as OntologyPackV1["match"],
  };
}

function validateSymbolExtractor(value: unknown): SymbolExtractorV1 {
  if (
    !isRecord(value) ||
    typeof value.supports !== "function" ||
    typeof value.analyze !== "function"
  ) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "symbolExtractor must expose supports() and analyze()",
    );
  }
  return {
    id: requireString(value.id, "symbolExtractor.id", "INVALID_CAPABILITY"),
    supports: value.supports as SymbolExtractorV1["supports"],
    analyze: value.analyze as SymbolExtractorV1["analyze"],
  };
}

// implements REQ-capability-plugin-protocol-v1
export function validateKibiPlugin(value: unknown): KibiPluginV1 {
  if (!isRecord(value)) {
    throw new PluginValidationError(
      "INVALID_PLUGIN",
      "Plugin export must be an object",
    );
  }
  const apiVersion = requireString(value.apiVersion, "apiVersion");
  if (apiVersion !== KIBI_PLUGIN_API_VERSION) {
    throw new PluginValidationError(
      "UNSUPPORTED_API_VERSION",
      `Unsupported plugin apiVersion '${apiVersion}'; expected '${KIBI_PLUGIN_API_VERSION}'`,
    );
  }
  const id = requireString(value.id, "id");
  const version = requireString(value.version, "version");
  const permissions = validatePermissions(value.permissions);
  if (!isRecord(value.capabilities)) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "capabilities must be an object",
    );
  }

  const capabilities: KibiPluginV1["capabilities"] = {};
  if (value.capabilities.semanticClassifier !== undefined) {
    Object.assign(capabilities, {
      semanticClassifier: validateSemanticClassifier(
        value.capabilities.semanticClassifier,
      ),
    });
  }
  if (value.capabilities.ontologyPack !== undefined) {
    Object.assign(capabilities, {
      ontologyPack: validateOntologyPack(value.capabilities.ontologyPack),
    });
  }
  if (value.capabilities.symbolExtractor !== undefined) {
    Object.assign(capabilities, {
      symbolExtractor: validateSymbolExtractor(
        value.capabilities.symbolExtractor,
      ),
    });
  }

  if (
    capabilities.semanticClassifier === undefined &&
    capabilities.ontologyPack === undefined &&
    capabilities.symbolExtractor === undefined
  ) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "Plugin must declare at least one supported capability",
    );
  }

  const capabilityIds = [
    capabilities.semanticClassifier?.id,
    capabilities.ontologyPack?.id,
    capabilities.symbolExtractor?.id,
  ].filter((entry): entry is string => typeof entry === "string");
  if (new Set(capabilityIds).size !== capabilityIds.length) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "capability provider ids must be unique within a plugin",
    );
  }

  return {
    apiVersion: KIBI_PLUGIN_API_VERSION,
    id,
    version,
    permissions,
    capabilities,
  };
}

// implements REQ-capability-plugin-protocol-v1
export function validateProjectKibiConfig(value: unknown): ProjectKibiConfig {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    throw new PluginValidationError(
      "INVALID_PROJECT_CONFIG",
      "package.json kibi field must be an object",
    );
  }
  if (value.plugins === undefined) return {};
  if (!Array.isArray(value.plugins)) {
    throw new PluginValidationError(
      "INVALID_PROJECT_CONFIG",
      "kibi.plugins must be an array",
    );
  }

  const plugins: ProjectPluginEntry[] = value.plugins.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new PluginValidationError(
        "INVALID_PROJECT_CONFIG",
        `kibi.plugins[${index}] must be an object`,
      );
    }
    const packageName = requireString(
      entry.package,
      `kibi.plugins[${index}].package`,
      "INVALID_PROJECT_CONFIG",
    );
    if (
      packageName.startsWith(".") ||
      packageName.startsWith("/") ||
      packageName.includes(":") ||
      packageName.includes("\\")
    ) {
      throw new PluginValidationError(
        "INVALID_PACKAGE_REFERENCE",
        `kibi.plugins[${index}].package must be a bare package name; paths and URLs are rejected in v1`,
      );
    }
    if (!isRecord(entry.capabilities)) {
      throw new PluginValidationError(
        "INVALID_PROJECT_CONFIG",
        `kibi.plugins[${index}].capabilities must be an object`,
      );
    }
    const capabilities: ProjectPluginEntry["capabilities"] = {};
    for (const [capabilityId, config] of Object.entries(entry.capabilities)) {
      if (!isCapabilityId(capabilityId)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY",
          `Unknown capability '${capabilityId}' in kibi.plugins[${index}]`,
        );
      }
      if (!isRecord(config) || typeof config.mode !== "string") {
        throw new PluginValidationError(
          "INVALID_PROJECT_CONFIG",
          `kibi.plugins[${index}].capabilities.${capabilityId}.mode is required`,
        );
      }
      if (!isPluginMode(config.mode)) {
        throw new PluginValidationError(
          "INVALID_MODE",
          `Unsupported mode '${config.mode}' for ${capabilityId}`,
        );
      }
      Object.assign(capabilities, {
        [capabilityId]: { mode: config.mode },
      });
    }
    return { package: packageName, capabilities };
  });

  const seenPackages = new Set<string>();
  const seenPackageCapabilities = new Set<string>();
  const replaceOwners = new Map<CapabilityId, string>();
  for (const plugin of plugins) {
    if (seenPackages.has(plugin.package)) {
      throw new PluginValidationError(
        "INVALID_PROJECT_CONFIG",
        `kibi.plugins activates '${plugin.package}' more than once`,
      );
    }
    seenPackages.add(plugin.package);
    for (const [capabilityId, config] of Object.entries(plugin.capabilities)) {
      const pairKey = `${plugin.package}::${capabilityId}`;
      if (seenPackageCapabilities.has(pairKey)) {
        throw new PluginValidationError(
          "INVALID_PROJECT_CONFIG",
          `kibi.plugins activates '${plugin.package}' for ${capabilityId} more than once`,
        );
      }
      seenPackageCapabilities.add(pairKey);
      if (config?.mode === "replace") {
        const existing = replaceOwners.get(capabilityId as CapabilityId);
        if (existing !== undefined) {
          throw new PluginValidationError(
            "INVALID_PROJECT_CONFIG",
            `At most one replace provider is allowed for ${capabilityId}; both '${existing}' and '${plugin.package}' requested replace`,
          );
        }
        replaceOwners.set(capabilityId as CapabilityId, plugin.package);
      }
    }
  }

  return { plugins };
}

// implements REQ-capability-plugin-protocol-v1
export function validateSemanticClassifierResult(
  value: unknown,
  options?: Readonly<{ expectedClaimKeys?: readonly string[] }>,
): SemanticClassifierResult {
  if (!isRecord(value) || !Array.isArray(value.decisions)) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      "semantic classifier result must include decisions[]",
    );
  }
  const seenClaimKeys = new Set<string>();
  const decisions: SemanticClassificationDecision[] = value.decisions.map(
    (decision, index) => {
      if (!isRecord(decision)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `decisions[${index}] must be an object`,
        );
      }
      const lane = requireString(
        decision.lane,
        `decisions[${index}].lane`,
        "INVALID_CAPABILITY_RESULT",
      );
      if (!(SEMANTIC_LANES as readonly string[]).includes(lane)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `decisions[${index}].lane '${lane}' is not a supported lane`,
        );
      }
      const confidence = requireFiniteNumber(
        decision.confidence,
        `decisions[${index}].confidence`,
      );
      if (confidence < 0 || confidence > 1) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `decisions[${index}].confidence must be between 0 and 1`,
        );
      }
      const claimKey = requireString(
        decision.claimKey,
        `decisions[${index}].claimKey`,
        "INVALID_CAPABILITY_RESULT",
      );
      if (seenClaimKeys.has(claimKey)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `duplicate decision for claimKey '${claimKey}'`,
        );
      }
      seenClaimKeys.add(claimKey);
      if (
        options?.expectedClaimKeys &&
        !options.expectedClaimKeys.includes(claimKey)
      ) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `foreign claimKey '${claimKey}' is not in the supplied classifier input`,
        );
      }
      let ambiguity: SemanticClassificationDecision["ambiguity"] | undefined;
      if (decision.ambiguity !== undefined) {
        if (!isRecord(decision.ambiguity)) {
          throw new PluginValidationError(
            "INVALID_CAPABILITY_RESULT",
            `decisions[${index}].ambiguity must be an object`,
          );
        }
        const ambiguityConfidence = requireFiniteNumber(
          decision.ambiguity.confidence,
          `decisions[${index}].ambiguity.confidence`,
        );
        if (ambiguityConfidence < 0 || ambiguityConfidence > 1) {
          throw new PluginValidationError(
            "INVALID_CAPABILITY_RESULT",
            `decisions[${index}].ambiguity.confidence must be between 0 and 1`,
          );
        }
        ambiguity = {
          ambiguous: requireBoolean(
            decision.ambiguity.ambiguous,
            `decisions[${index}].ambiguity.ambiguous`,
          ),
          confidence: ambiguityConfidence,
        };
      }
      return {
        claimKey,
        lane: lane as SemanticClassificationDecision["lane"],
        confidence,
        ...(ambiguity ? { ambiguity } : {}),
        ...(Array.isArray(decision.signals)
          ? {
              signals: decision.signals.map((signal, signalIndex) => {
                const kind = requireString(
                  signal,
                  `decisions[${index}].signals[${signalIndex}]`,
                  "INVALID_CAPABILITY_RESULT",
                );
                if (
                  !(SEMANTIC_SIGNAL_KINDS as readonly string[]).includes(kind)
                ) {
                  throw new PluginValidationError(
                    "INVALID_CAPABILITY_RESULT",
                    `decisions[${index}].signals[${signalIndex}] '${kind}' is not a supported signal`,
                  );
                }
                return kind as SemanticSignalKind;
              }),
            }
          : {}),
      };
    },
  );
  return { decisions };
}

// implements REQ-capability-plugin-protocol-v1
export function validatePredicateSchema(
  value: unknown,
): PredicateSchemaDefinition {
  if (!isRecord(value)) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_SCHEMA",
      "predicate schema must be an object",
    );
  }
  const argumentNames = Array.isArray(value.argumentNames)
    ? value.argumentNames.map((entry, index) =>
        requireString(
          entry,
          `argumentNames[${index}]`,
          "INVALID_ONTOLOGY_SCHEMA",
        ),
      )
    : null;
  const argumentTypes = Array.isArray(value.argumentTypes)
    ? value.argumentTypes.map((entry, index) =>
        requireString(
          entry,
          `argumentTypes[${index}]`,
          "INVALID_ONTOLOGY_SCHEMA",
        ),
      )
    : null;
  if (argumentNames === null || argumentTypes === null) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_SCHEMA",
      "argumentNames and argumentTypes must be string arrays",
    );
  }
  if (argumentNames.length !== argumentTypes.length) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_SCHEMA",
      "argumentNames and argumentTypes must have the same length",
    );
  }
  return {
    schemaId: requireString(
      value.schemaId,
      "schemaId",
      "INVALID_ONTOLOGY_SCHEMA",
    ),
    predicateName: requireString(
      value.predicateName,
      "predicateName",
      "INVALID_ONTOLOGY_SCHEMA",
    ),
    argumentNames,
    argumentTypes,
    ...(typeof value.title === "string" ? { title: value.title } : {}),
    ...(typeof value.description === "string"
      ? { description: value.description }
      : {}),
    ...(Array.isArray(value.aliases)
      ? {
          aliases: value.aliases.map((entry, index) =>
            requireString(
              entry,
              `aliases[${index}]`,
              "INVALID_ONTOLOGY_SCHEMA",
            ),
          ),
        }
      : {}),
  };
}

// implements REQ-capability-plugin-protocol-v1
export function validateOntologyMatchCandidate(
  value: unknown,
  schemas: readonly PredicateSchemaDefinition[],
): OntologyMatchCandidate {
  if (!isRecord(value)) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      "ontology match candidate must be an object",
    );
  }
  const schemaId = requireString(
    value.schemaId,
    "schemaId",
    "INVALID_ONTOLOGY_CANDIDATE",
  );
  const schema = schemas.find((entry) => entry.schemaId === schemaId);
  if (!schema) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      `Candidate schemaId '${schemaId}' is not declared by an active ontology pack`,
    );
  }
  const predicateName = requireString(
    value.predicateName,
    "predicateName",
    "INVALID_ONTOLOGY_CANDIDATE",
  );
  if (predicateName !== schema.predicateName) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      `Candidate predicateName '${predicateName}' does not match schema '${schema.predicateName}'`,
    );
  }
  if (!Array.isArray(value.arguments)) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      "arguments must be a string array",
    );
  }
  if (value.arguments.length !== schema.argumentNames.length) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      `Candidate arity ${value.arguments.length} does not match schema arity ${schema.argumentNames.length}`,
    );
  }
  const polarity = requireString(
    value.polarity,
    "polarity",
    "INVALID_ONTOLOGY_CANDIDATE",
  );
  if (!(ONTOLOGY_POLARITIES as readonly string[]).includes(polarity)) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      `Unsupported polarity '${polarity}'`,
    );
  }
  const confidence = requireFiniteNumber(value.confidence, "confidence");
  if (confidence < 0 || confidence > 1) {
    throw new PluginValidationError(
      "INVALID_ONTOLOGY_CANDIDATE",
      "confidence must be between 0 and 1",
    );
  }
  return {
    schemaId,
    predicateName,
    arguments: value.arguments.map((entry, index) =>
      requireString(entry, `arguments[${index}]`, "INVALID_ONTOLOGY_CANDIDATE"),
    ),
    polarity: polarity as OntologyMatchCandidate["polarity"],
    confidence,
    evidence: requireString(
      value.evidence,
      "evidence",
      "INVALID_ONTOLOGY_CANDIDATE",
    ),
    ...(typeof value.rationale === "string"
      ? { rationale: value.rationale }
      : {}),
  };
}

// implements REQ-capability-plugin-protocol-v1
export function validateSourceAnalysisResult(
  value: unknown,
): SourceAnalysisResult {
  if (
    !isRecord(value) ||
    !isRecord(value.module) ||
    !Array.isArray(value.symbols)
  ) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      "symbol analysis result must include module and symbols[]",
    );
  }
  const analysisMode = requireString(
    value.module.analysisMode,
    "module.analysisMode",
    "INVALID_CAPABILITY_RESULT",
  );
  if (analysisMode !== "parser" && analysisMode !== "fallback") {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      `Unsupported analysisMode '${analysisMode}'`,
    );
  }
  return {
    sourceFile: requireString(
      value.sourceFile,
      "sourceFile",
      "INVALID_CAPABILITY_RESULT",
    ),
    language: requireString(
      value.language,
      "language",
      "INVALID_CAPABILITY_RESULT",
    ),
    module: {
      title: requireString(
        value.module.title,
        "module.title",
        "INVALID_CAPABILITY_RESULT",
      ),
      language: requireString(
        value.module.language,
        "module.language",
        "INVALID_CAPABILITY_RESULT",
      ),
      analysisMode,
      ...(typeof value.module.fallbackReason === "string"
        ? { fallbackReason: value.module.fallbackReason }
        : {}),
    },
    symbols: value.symbols.map((symbol, index) => {
      if (!isRecord(symbol)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}] must be an object`,
        );
      }
      const kind = requireString(
        symbol.kind,
        `symbols[${index}].kind`,
        "INVALID_CAPABILITY_RESULT",
      );
      if (!(SOURCE_SYMBOL_KINDS as readonly string[]).includes(kind)) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}].kind '${kind}' is not a supported SourceSymbolKind`,
        );
      }
      const startLine = requireFiniteNumber(
        symbol.startLine,
        `symbols[${index}].startLine`,
      );
      const startColumn = requireFiniteNumber(
        symbol.startColumn,
        `symbols[${index}].startColumn`,
      );
      const endLine = requireFiniteNumber(
        symbol.endLine,
        `symbols[${index}].endLine`,
      );
      const endColumn = requireFiniteNumber(
        symbol.endColumn,
        `symbols[${index}].endColumn`,
      );
      if (!Number.isInteger(startLine) || startLine < 1) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}].startLine must be an integer >= 1`,
        );
      }
      if (!Number.isInteger(endLine) || endLine < 1) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}].endLine must be an integer >= 1`,
        );
      }
      if (!Number.isInteger(startColumn) || startColumn < 0) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}].startColumn must be an integer >= 0`,
        );
      }
      if (!Number.isInteger(endColumn) || endColumn < 0) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}].endColumn must be an integer >= 0`,
        );
      }
      if (
        endLine < startLine ||
        (endLine === startLine && endColumn < startColumn)
      ) {
        throw new PluginValidationError(
          "INVALID_CAPABILITY_RESULT",
          `symbols[${index}] end position must not precede start position`,
        );
      }
      return {
        name: requireString(
          symbol.name,
          `symbols[${index}].name`,
          "INVALID_CAPABILITY_RESULT",
        ),
        kind: kind as SourceSymbolKind,
        startLine,
        startColumn,
        endLine,
        endColumn,
        ...(typeof symbol.directiveText === "string"
          ? { directiveText: symbol.directiveText }
          : {}),
      };
    }),
  };
}

/** Ensure analysis sourceFile matches the requested path when provided. */
// implements REQ-capability-plugin-protocol-v1
export function validateSourceAnalysisResultForPath(
  value: unknown,
  requestedPath: string,
): SourceAnalysisResult {
  const result = validateSourceAnalysisResult(value);
  if (result.sourceFile !== requestedPath) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      `result sourceFile '${result.sourceFile}' does not match requested path '${requestedPath}'`,
    );
  }
  if (result.module.language !== result.language) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      "module.language must match result.language",
    );
  }
  return result;
}
