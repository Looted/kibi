import { describe, expect, test } from "bun:test";
import {
  EXTERNAL_SEARCH_HINTS_OPERATIONS,
  EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS,
  EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS,
  allowsExternalSearchHints,
  allowsExternalSemanticClassifier,
  allowsExternalVocabularyAlignment,
} from "../../src/plugins/external-allowlist.js";

// implements REQ-capability-plugin-activation-disclosure-v1, REQ-kibi-vocabulary-alignment-capability, REQ-kibi-search-hints-host

describe("external capability allowlists", () => {
  test("list exactly the operation boundaries that may import plugins", () => {
    expect([...EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS]).toStrictEqual([
      "kb_semantic_advisor",
      "kb_compile_intent",
    ]);
    expect([...EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS]).toStrictEqual([
      "kb_model_requirement",
    ]);
    expect([...EXTERNAL_SEARCH_HINTS_OPERATIONS]).toStrictEqual(["kb_search"]);
  });

  test("semantic classifier allows only its operations", () => {
    expect(allowsExternalSemanticClassifier("kb_semantic_advisor")).toBe(true);
    expect(allowsExternalSemanticClassifier("kb_compile_intent")).toBe(true);
    expect(allowsExternalSemanticClassifier("kb_check")).toBe(false);
    expect(allowsExternalSemanticClassifier("")).toBe(false);
  });

  test("vocabulary alignment allows only requirement modeling", () => {
    expect(allowsExternalVocabularyAlignment("kb_model_requirement")).toBe(
      true,
    );
    expect(allowsExternalVocabularyAlignment("kb_check")).toBe(false);
    expect(allowsExternalVocabularyAlignment("kb_search")).toBe(false);
  });

  test("search hints allow only kb_search", () => {
    expect(allowsExternalSearchHints("kb_search")).toBe(true);
    expect(allowsExternalSearchHints("kb_check")).toBe(false);
    expect(allowsExternalSearchHints("kb_model_requirement")).toBe(false);
  });
});
