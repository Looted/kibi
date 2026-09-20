import {
  KIBI_PLUGIN_API_VERSION,
  ONTOLOGY_PACK_CAPABILITY_ID,
  PLUGIN_MODES,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
  type CapabilityId,
  type KibiPluginV1,
  type PluginMode,
  type PluginPermissions,
  type ProjectKibiConfig,
  type ProjectPluginEntry,
} from "./protocol.js";
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
  SymbolExtractorV1,
} from "./capabilities/symbol-extractor.js";

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
    throw new PluginValidationError(code, `${field} must be a non-empty string`);
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
export function validatePermissions(
  value: unknown,
): PluginPermissions {
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
    requireString(entry, `permissions.secrets[${index}]`, "INVALID_PERMISSIONS"),
  );
  return { network, metered, secrets };
}

function validateSemanticClassifier(value: unknown): SemanticClassifierV1 {
  if (!isRecord(value) || typeof value.classify !== "function") {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "semanticClassifier must expose classify()",
    );
  }
  return {
    id: requireString(value.id, "semanticClassifier.id", "INVALID_CAPABILITY"),
    classify: value.classify as SemanticClassifierV1["classify"],
  };
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

  return { plugins };
}

// implements REQ-capability-plugin-protocol-v1
export function validateSemanticClassifierResult(
  value: unknown,
): SemanticClassifierResult {
  if (!isRecord(value) || !Array.isArray(value.decisions)) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY_RESULT",
      "semantic classifier result must include decisions[]",
    );
  }
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
      return {
        claimKey: requireString(
          decision.claimKey,
          `decisions[${index}].claimKey`,
          "INVALID_CAPABILITY_RESULT",
        ),
        lane: lane as SemanticClassificationDecision["lane"],
        confidence,
        ...(decision.ambiguity !== undefined && isRecord(decision.ambiguity)
          ? {
              ambiguity: {
                ambiguous: requireBoolean(
                  decision.ambiguity.ambiguous,
                  `decisions[${index}].ambiguity.ambiguous`,
                ),
                confidence: requireFiniteNumber(
                  decision.ambiguity.confidence,
                  `decisions[${index}].ambiguity.confidence`,
                ),
              },
            }
          : {}),
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
            requireString(entry, `aliases[${index}]`, "INVALID_ONTOLOGY_SCHEMA"),
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
  if (!isRecord(value) || !isRecord(value.module) || !Array.isArray(value.symbols)) {
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
      return {
        name: requireString(
          symbol.name,
          `symbols[${index}].name`,
          "INVALID_CAPABILITY_RESULT",
        ),
        kind: requireString(
          symbol.kind,
          `symbols[${index}].kind`,
          "INVALID_CAPABILITY_RESULT",
        ) as SourceAnalysisResult["symbols"][number]["kind"],
        startLine: requireFiniteNumber(
          symbol.startLine,
          `symbols[${index}].startLine`,
        ),
        startColumn: requireFiniteNumber(
          symbol.startColumn,
          `symbols[${index}].startColumn`,
        ),
        endLine: requireFiniteNumber(
          symbol.endLine,
          `symbols[${index}].endLine`,
        ),
        endColumn: requireFiniteNumber(
          symbol.endColumn,
          `symbols[${index}].endColumn`,
        ),
        ...(typeof symbol.directiveText === "string"
          ? { directiveText: symbol.directiveText }
          : {}),
      };
    }),
  };
}
