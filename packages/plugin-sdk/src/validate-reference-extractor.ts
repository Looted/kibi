import type {
  ReferenceExtractionResultV1,
  ReferenceExtractorV1,
  UnresolvedReferenceV1,
} from "./capabilities/reference-extractor.js";
import { PluginValidationError } from "./validation-error.js";

const MAX_MEMBERS = 100_000;
const MAX_TEXT = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failResult(message: string): never {
  throw new PluginValidationError("INVALID_CAPABILITY_RESULT", message);
}

/** A referenceExtractor capability exposes an id, supports() and extract(). */
// implements REQ-kibi-tree-sitter-references
export function validateReferenceExtractor(
  value: unknown,
): ReferenceExtractorV1 {
  if (
    !isRecord(value) ||
    typeof value.supports !== "function" ||
    typeof value.extract !== "function"
  ) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "referenceExtractor must expose supports() and extract()",
    );
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "referenceExtractor.id must be a non-empty string",
    );
  }
  const supports = value.supports as ReferenceExtractorV1["supports"];
  const extract = value.extract as ReferenceExtractorV1["extract"];
  return {
    id: value.id.trim(),
    supports: (input) => supports.call(value, input),
    extract: (input) => extract.call(value, input),
  };
}

/**
 * Validate one extraction result. Members are strings, unresolved rows carry a
 * positive line and their text, and a refusal names a code and a message, so
 * the host can always say why a read was refused.
 */
// implements REQ-kibi-tree-sitter-references
export function validateReferenceExtractionResult(
  value: unknown,
): ReferenceExtractionResultV1 {
  if (!isRecord(value)) failResult("reference extraction must be an object");
  if (value.contractVersion !== "kibi.reference-extractor.v1")
    failResult("contractVersion must be kibi.reference-extractor.v1");
  if (value.status === "ok") {
    if (typeof value.language !== "string" || value.language.length === 0)
      failResult("language must be a non-empty string");
    if (!Array.isArray(value.members) || value.members.length > MAX_MEMBERS)
      failResult(`members must be an array of at most ${MAX_MEMBERS} strings`);
    for (const member of value.members)
      if (typeof member !== "string") failResult("members must be strings");
    if (!Array.isArray(value.unresolved))
      failResult("unresolved must be an array");
    const unresolved: UnresolvedReferenceV1[] = value.unresolved.map((row) => {
      if (
        !isRecord(row) ||
        typeof row.line !== "number" ||
        !Number.isInteger(row.line) ||
        row.line < 1 ||
        typeof row.text !== "string"
      )
        failResult("unresolved rows must carry a positive line and its text");
      return { line: row.line, text: row.text.slice(0, MAX_TEXT) };
    });
    return {
      contractVersion: "kibi.reference-extractor.v1",
      status: "ok",
      language: value.language,
      members: [...(value.members as string[])],
      unresolved,
    };
  }
  if (value.status !== "unsupported" && value.status !== "failed")
    failResult("status must be ok, unsupported or failed");
  if (typeof value.code !== "string" || value.code.length === 0)
    failResult("a refused extraction must name a code");
  if (typeof value.message !== "string" || value.message.length === 0)
    failResult("a refused extraction must carry a message");
  return {
    contractVersion: "kibi.reference-extractor.v1",
    status: value.status,
    ...(typeof value.language === "string" ? { language: value.language } : {}),
    code: value.code,
    message: value.message,
  };
}
