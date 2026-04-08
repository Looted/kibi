import { beforeEach, describe, expect, it, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Module mocking
// ---------------------------------------------------------------------------
// Bun hoists `mock.module` calls before imports.  Mock factories read state
// from `globalThis.__mv` at CALL time (not definition time), so tests can
// configure behaviour via `beforeEach` / per-test overrides.

mock.module("gray-matter", () => ({
  default: (_content: string) => {
    const s = (globalThis as any).__mv;
    if (s?.matterError) throw s.matterError;
    return s?.matterReturn ?? { data: {} };
  },
}));

mock.module("../../src/extractors/markdown.js", () => {
  // Recreate FrontmatterError so `instanceof` works consistently across the
  // mock boundary (source and test share the same mocked class).
  class FrontmatterError extends Error {
    public classification: string;
    public hint: string;
    public originalError?: string;

    constructor(
      message: string,
      public filePath: string,
      options?: {
        classification?: string;
        hint?: string;
        originalError?: string;
      },
    ) {
      super(message);
      this.name = "FrontmatterError";
      this.classification = options?.classification ?? "Generic Error";
      this.hint = options?.hint ?? "Check the file for syntax errors.";
      this.originalError = options?.originalError;
    }

    override toString() {
      let msg = `${this.filePath}: [${this.classification}] ${this.message}`;
      if (this.hint) msg += `\nHow to fix:\n- ${this.hint}`;
      if (this.originalError)
        msg += `\n\nOriginal error: ${this.originalError}`;
      return msg;
    }
  }

  return {
    FrontmatterError,
    detectEmbeddedEntities: (
      data: Record<string, unknown>,
      entityType: string,
    ): string[] => {
      const s = (globalThis as any).__mv;
      if (s) s.detectCalls.push([data, entityType]);
      return s?.detectReturn ?? [];
    },
  };
});

// Imports resolved AFTER mock.module registrations
import { FrontmatterError } from "../../src/extractors/markdown";
import {
  type MarkdownValidationResult,
  validateStagedMarkdown,
} from "../../src/traceability/markdown-validate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s() {
  return (globalThis as any).__mv;
}

function resetState() {
  (globalThis as any).__mv = {
    matterReturn: { data: {} as Record<string, unknown> },
    matterError: null as Error | null,
    detectReturn: [] as string[],
    detectCalls: [] as Array<[Record<string, unknown>, string]>,
  };
}

// ===================================================================
// validateStagedMarkdown
// ===================================================================

describe("validateStagedMarkdown", () => {
  beforeEach(resetState);

  // -- No type determined → early return --------------------------------

  it("returns empty errors when no type in frontmatter and path has no type keywords", () => {
    s().matterReturn = { data: {} };
    const res = validateStagedMarkdown("/some/random/file.md", "content");
    expect(res.filePath).toBe("/some/random/file.md");
    expect(res.errors).toEqual([]);
    // detectEmbeddedEntities should NOT have been called (early return)
    expect(s().detectCalls.length).toBe(0);
  });

  // -- Has type, no embedded entities -----------------------------------

  it("returns empty errors for type='req' with no embedded entities", () => {
    s().matterReturn = { data: { type: "req" } };
    s().detectReturn = [];
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.errors).toEqual([]);
    expect(s().detectCalls.length).toBe(1);
    expect(s().detectCalls[0]![1]).toBe("req");
  });

  it("returns empty errors for type='scenario' with no embedded entities", () => {
    s().matterReturn = { data: { type: "scenario" } };
    s().detectReturn = [];
    const res = validateStagedMarkdown("/docs/scen.md", "content");
    expect(res.errors).toEqual([]);
    expect(s().detectCalls[0]![1]).toBe("scenario");
  });

  it("returns empty errors for type='test' with no embedded entities", () => {
    s().matterReturn = { data: { type: "test" } };
    s().detectReturn = [];
    const res = validateStagedMarkdown("/docs/test.md", "content");
    expect(res.errors).toEqual([]);
    expect(s().detectCalls[0]![1]).toBe("test");
  });

  // -- Embedded entity violations ---------------------------------------

  it("adds error when embedded 'scenario' entity is detected", () => {
    s().matterReturn = { data: { type: "req" } };
    s().detectReturn = ["scenario"];
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.errors.length).toBe(1);
    const err = res.errors[0]!;
    expect(err).toBeInstanceOf(FrontmatterError);
    expect(err.message).toContain("Invalid embedded entity");
    expect(err.message).toContain("scenario");
    expect(err.classification).toBe("Embedded Entity Violation");
    expect(err.hint).toContain("Move scenario");
    expect(err.hint).toContain("specified_by");
    expect(err.filePath).toBe("/docs/req.md");
  });

  it("adds error when embedded 'test' entity is detected", () => {
    s().matterReturn = { data: { type: "req" } };
    s().detectReturn = ["test"];
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]!.message).toContain("test");
    expect(res.errors[0]!.hint).toContain("Move test");
  });

  it("adds error when both 'scenario' and 'test' entities are detected", () => {
    s().matterReturn = { data: { type: "req" } };
    s().detectReturn = ["scenario", "test"];
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.errors.length).toBe(1);
    // join produces "scenario and test"
    expect(res.errors[0]!.message).toContain("scenario and test");
    expect(res.errors[0]!.hint).toContain("Move scenario and test");
  });

  // -- Error handling (catch block) -------------------------------------

  it("handles generic parse errors silently (non-FrontmatterError)", () => {
    s().matterError = new Error("YAML parse error");
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.filePath).toBe("/docs/req.md");
    // Generic errors are caught but NOT added to errors list
    expect(res.errors).toEqual([]);
    expect(s().detectCalls.length).toBe(0);
  });

  it("captures FrontmatterError thrown during matter parsing", () => {
    const fe = new FrontmatterError("bad frontmatter", "/docs/req.md", {
      classification: "Parse Error",
      hint: "Fix your YAML",
    });
    s().matterError = fe;
    const res = validateStagedMarkdown("/docs/req.md", "content");
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]).toBe(fe);
    expect(res.errors[0]!.filePath).toBe("/docs/req.md");
    expect(res.errors[0]!.classification).toBe("Parse Error");
  });

  // -- Content edge cases -----------------------------------------------

  it("handles undefined content gracefully (matter throws, caught)", () => {
    s().matterError = new TypeError("Cannot read properties of undefined");
    const res = validateStagedMarkdown("/docs/req.md", undefined as any);
    expect(res.errors).toEqual([]);
  });

  it("handles null content gracefully (matter throws, caught)", () => {
    s().matterError = new TypeError("Expected string, got null");
    const res = validateStagedMarkdown("/docs/req.md", null as any);
    expect(res.errors).toEqual([]);
  });

  // -- Result shape -----------------------------------------------------

  it("returns MarkdownValidationResult with correct interface shape", () => {
    s().matterReturn = { data: {} };
    const res: MarkdownValidationResult = validateStagedMarkdown(
      "/path/to/x.md",
      "c",
    );
    expect(res).toHaveProperty("filePath");
    expect(res).toHaveProperty("errors");
    expect(Array.isArray(res.errors)).toBe(true);
  });

  // -- filePath preservation --------------------------------------------

  it("preserves arbitrary filePath in result", () => {
    s().matterReturn = { data: {} };
    const path = "/deep/nested/dir/structure/file.md";
    const res = validateStagedMarkdown(path, "content");
    expect(res.filePath).toBe(path);
  });
});

// ===================================================================
// inferTypeFromPath (private – tested indirectly via validateStagedMarkdown)
// ===================================================================

describe("inferTypeFromPath (tested via validateStagedMarkdown)", () => {
  beforeEach(resetState);

  it("infers 'req' from path containing /requirements/", () => {
    validateStagedMarkdown("/docs/requirements/REQ-001.md", "content");
    expect(s().detectCalls.length).toBe(1);
    expect(s().detectCalls[0]![1]).toBe("req");
  });

  it("infers 'scenario' from path containing /scenarios/", () => {
    validateStagedMarkdown("/docs/scenarios/SCEN-001.md", "content");
    expect(s().detectCalls.length).toBe(1);
    expect(s().detectCalls[0]![1]).toBe("scenario");
  });

  it("infers 'test' from path containing /tests/", () => {
    validateStagedMarkdown("/docs/tests/TEST-001.md", "content");
    expect(s().detectCalls.length).toBe(1);
    expect(s().detectCalls[0]![1]).toBe("test");
  });

  it("returns null for paths without type keywords (no detect call)", () => {
    validateStagedMarkdown("/docs/random/thing.md", "content");
    expect(s().detectCalls.length).toBe(0);
  });

  it("is case-sensitive: /Requirements/ does not infer 'req'", () => {
    validateStagedMarkdown("/docs/Requirements/REQ-001.md", "content");
    expect(s().detectCalls.length).toBe(0);
  });

  it("does not match partial directory names like /requirements-other/", () => {
    validateStagedMarkdown("/docs/requirements-other/file.md", "content");
    expect(s().detectCalls.length).toBe(0);
  });

  it("prefers explicit frontmatter type over path inference", () => {
    s().matterReturn = { data: { type: "scenario" } };
    validateStagedMarkdown("/docs/requirements/REQ-001.md", "content");
    expect(s().detectCalls[0]![1]).toBe("scenario");
  });

  it("uses empty-string type as falsy and falls back to path", () => {
    s().matterReturn = { data: { type: "" } };
    validateStagedMarkdown("/docs/requirements/REQ-001.md", "content");
    expect(s().detectCalls[0]![1]).toBe("req");
  });
});

// ===================================================================
// FrontmatterError (mocked class – exercises constructor & toString)
// ===================================================================

describe("FrontmatterError", () => {
  it("has correct default classification and hint", () => {
    const err = new FrontmatterError("test error", "/path/to/file.md");
    expect(err.name).toBe("FrontmatterError");
    expect(err.classification).toBe("Generic Error");
    expect(err.hint).toBe("Check the file for syntax errors.");
    expect(err.message).toBe("test error");
    expect(err.filePath).toBe("/path/to/file.md");
    expect(err.originalError).toBeUndefined();
  });

  it("accepts custom classification, hint, and originalError", () => {
    const err = new FrontmatterError("test", "/f.md", {
      classification: "Custom Class",
      hint: "Do the thing",
      originalError: "some underlying error",
    });
    expect(err.classification).toBe("Custom Class");
    expect(err.hint).toBe("Do the thing");
    expect(err.originalError).toBe("some underlying error");
  });

  it("formats toString with classification, hint, and originalError", () => {
    const err = new FrontmatterError("broken", "/f.md", {
      classification: "Parse",
      hint: "Fix YAML",
      originalError: "bad indent",
    });
    const str = err.toString();
    expect(str).toContain("/f.md: [Parse] broken");
    expect(str).toContain("How to fix:");
    expect(str).toContain("Fix YAML");
    expect(str).toContain("Original error: bad indent");
  });

  it("formats toString without optional fields", () => {
    const err = new FrontmatterError("simple", "/x.md");
    const str = err.toString();
    expect(str).toContain("/x.md: [Generic Error] simple");
    expect(str).toContain("How to fix:");
    expect(str).not.toContain("Original error:");
  });

  it("is instanceof Error", () => {
    const err = new FrontmatterError("test", "/f.md");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FrontmatterError);
  });
});
