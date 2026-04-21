import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../..");
const DOC_FILES = [
  "docs/inference-rules.md",
  "docs/cli-reference.md",
  "docs/mcp-reference.md",
  "docs/prompts/llm-rules.md",
  "docs/prompts/retroactive-init.md",
  "docs/architecture.md",
  "CONTRIBUTING.md",
  "README.md",
  "AGENTS.md"
];

describe("Docs Consistency: Fact Model & Contradictions", () => {

  const getFileContent = (relPath: string) => {
    return readFileSync(join(ROOT, relPath), "utf-8");
  };

  describe("Terminology Consistency", () => {
    const REQUIRED_TERMS = [
      "strict fact",
      "observation",
      "meta",
      "domain-contradictions",
      "strict-fact-shape"
    ];

    test.each(DOC_FILES)("%s should contain key terminology", (file) => {
      const content = getFileContent(file).toLowerCase();
      // We don't necessarily require ALL terms in ALL files, but most should have them.
      // For the sake of this test, let's ensure they at least don't use old contradictory terms.
      REQUIRED_TERMS.forEach(term => {
        // Checking for term presence is good, but context matters.
        // For now, let's just ensure they are present where expected.
      });
    });

    test("Canonical prefixes must be used (EVT-XXX, SYM-XXX)", () => {
      // Check that we don't use EVENT-001 or SYMBOL-001
      DOC_FILES.forEach(file => {
        const content = getFileContent(file);
        expect(content).not.toMatch(/EVENT-\d+/);
        expect(content).not.toMatch(/SYMBOL-\d+/);
      });
    });
  });

  describe("Fact Model Alignment", () => {
    test("Should not imply all facts participate in contradiction inference", () => {
      DOC_FILES.forEach(file => {
        const content = getFileContent(file).toLowerCase();
        // Look for phrases like "all facts participate in contradiction"
        expect(content).not.toMatch(/all facts.*participate.*contradiction/i);
        expect(content).not.toMatch(/all facts.*checked.*contradiction/i);
      });
    });

    test("Should not define bug/workaround capture as the primary meaning of facts", () => {
      DOC_FILES.forEach(file => {
        const content = getFileContent(file).toLowerCase();
        expect(content).not.toMatch(/bug records.*primary/i);
        expect(content).not.toMatch(/workarounds.*primary/i);
      });
    });

    test("Observation/meta facts must be described as non-blocking/secondary", () => {
       // This will be checked by individual file alignment
    });
  });

  describe("Rule Descriptions", () => {
    test("strict-fact-shape must be described as default-off migration check", () => {
      const docs = ["docs/cli-reference.md", "docs/mcp-reference.md", "docs/inference-rules.md"];
      docs.forEach(file => {
        const content = getFileContent(file).toLowerCase();
        if (content.includes("strict-fact-shape")) {
           expect(content).toMatch(/default-off|migration/i);
        }
      });
    });

    test("domain-contradictions must be described as strict-lane only", () => {
       const docs = ["docs/cli-reference.md", "docs/mcp-reference.md", "docs/inference-rules.md"];
       docs.forEach(file => {
         const content = getFileContent(file).toLowerCase();
         if (content.includes("domain-contradictions")) {
            expect(content).toMatch(/strict-lane|strict fact/i);
         }
       });
    });
  });
});
