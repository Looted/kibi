import { describe, expect, it } from "bun:test";
import type { FileLifecycle } from "../src/file-operation-state.js";
import { classifyMeaningfulChange } from "../src/meaningful-change-classifier.js";
import type { PathKind } from "../src/path-kind.js";
import type { RiskClass } from "../src/risk-classifier.js";

describe("classifyMeaningfulChange", () => {
  describe("requires-kb-evidence", () => {
    it("returns requires-kb-evidence for source code files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "src/foo.ts",
        pathKind: "code",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for test files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "tests/foo.test.ts",
        pathKind: "test",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for requirement docs", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/requirements/auth.md",
        pathKind: "requirement",
        lifecycle: "created",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for scenario docs", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/scenarios/login.md",
        pathKind: "scenario",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for symbol files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: ".kb/symbols.yaml",
        pathKind: "symbol",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for KB docs", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: ".kb/some-entity.md",
        pathKind: "kb",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for adr files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/adr/001-choice.md",
        pathKind: "adr",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for fact files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/facts/domain.md",
        pathKind: "fact",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for flag files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/flags/feature-x.md",
        pathKind: "flag",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for event files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/events/order-placed.md",
        pathKind: "event",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for deleted code files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "src/foo.ts",
        pathKind: "code",
        lifecycle: "deleted",
      });
      expect(result).toBe("requires-kb-evidence");
    });
  });

  describe("advisory", () => {
    it("returns advisory for bun.lock", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "bun.lock",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("advisory");
    });

    it("returns advisory for bun.lockb", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "bun.lockb",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("advisory");
    });

    it("returns advisory for package-lock.json", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "package-lock.json",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("advisory");
    });

    it("returns advisory for pnpm-lock.yaml", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "pnpm-lock.yaml",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("advisory");
    });

    it("returns advisory for yarn.lock", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "yarn.lock",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("advisory");
    });

    it("returns advisory for safe_docs_only risk with unknown pathKind", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "README.md",
        pathKind: "unknown",
        lifecycle: "edited",
        riskClass: "safe_docs_only",
      });
      expect(result).toBe("advisory");
    });
  });

  describe("ignored", () => {
    it("returns ignored for paths under .git/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: ".git/HEAD",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under .kb/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: ".kb/config.json",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under .sisyphus/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: ".sisyphus/plans/foo.md",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under node_modules/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "node_modules/some-pkg/index.js",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under vendor/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "vendor/bundle.js",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under third_party/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "third_party/lib.js",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under dist/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "dist/output.js",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for paths under coverage/", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "coverage/lcov.info",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for .tsbuildinfo files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "packages/foo/tsconfig.tsbuildinfo",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });

    it("returns ignored for .map files", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "dist/bundle.js.map",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("ignored");
    });
  });

  describe("risk-based upgrade", () => {
    it("returns requires-kb-evidence for behavior_candidate risk", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "src/foo.ts",
        pathKind: "unknown",
        lifecycle: "edited",
        riskClass: "behavior_candidate",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for traceability_candidate risk", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "src/bar.ts",
        pathKind: "unknown",
        lifecycle: "edited",
        riskClass: "traceability_candidate",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("returns requires-kb-evidence for req_policy_candidate risk", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "docs/requirements/auth.md",
        pathKind: "unknown",
        lifecycle: "edited",
        riskClass: "req_policy_candidate",
      });
      expect(result).toBe("requires-kb-evidence");
    });

    it("still returns ignored when risk is high but path is ignored", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "node_modules/pkg/index.js",
        pathKind: "unknown",
        lifecycle: "edited",
        riskClass: "behavior_candidate",
      });
      expect(result).toBe("ignored");
    });
  });

  describe("default", () => {
    it("returns requires-kb-evidence as safety default for unknown paths", () => {
      const result = classifyMeaningfulChange({
        normalizedPath: "some/random/file.xyz",
        pathKind: "unknown",
        lifecycle: "edited",
      });
      expect(result).toBe("requires-kb-evidence");
    });
  });
});
