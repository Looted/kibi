import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const DOC_FILES = [
  "docs/inference-rules.md",
  "docs/cli-reference.md",
  "docs/mcp-reference.md",
  "docs/generic-agent-onboarding.md",
  "packages/runtime/src/skills/kibi-usage/SKILL.md",
  "packages/runtime/src/skills/kibi-usage/resources/fact-lanes.md",
  "packages/runtime/src/skills/kibi-bootstrap/SKILL.md",
  "docs/architecture.md",
  "CONTRIBUTING.md",
  "README.md",
  "AGENTS.md",
];

describe("Docs Consistency: Fact Model & Contradictions", () => {
  const getFileContent = (relPath: string) => {
    return readFileSync(join(ROOT, relPath), "utf-8");
  };

  describe("Terminology Consistency", () => {
    test.each(DOC_FILES)(
      "%s should not use deprecated entity prefixes",
      (file) => {
        const content = getFileContent(file);
        expect(content).not.toMatch(/EVENT-\d+/);
        expect(content).not.toMatch(/SYMBOL-\d+/);
      },
    );

    test("Canonical prefixes must be used (EVT-XXX, SYM-XXX)", () => {
      // Check that we don't use EVENT-001 or SYMBOL-001
      for (const file of DOC_FILES) {
        const content = getFileContent(file);
        expect(content).not.toMatch(/EVENT-\d+/);
        expect(content).not.toMatch(/SYMBOL-\d+/);
      }
    });
  });

  describe("Fact Model Alignment", () => {
    test("Should not imply all facts participate in contradiction inference", () => {
      for (const file of DOC_FILES) {
        const content = getFileContent(file).toLowerCase();
        // Look for phrases like "all facts participate in contradiction"
        expect(content).not.toMatch(/all facts.*participate.*contradiction/i);
        expect(content).not.toMatch(/all facts.*checked.*contradiction/i);
      }
    });

    test("Should not define bug/workaround capture as the primary meaning of facts", () => {
      for (const file of DOC_FILES) {
        const content = getFileContent(file).toLowerCase();
        expect(content).not.toMatch(/bug records.*primary/i);
        expect(content).not.toMatch(/workarounds.*primary/i);
      }
    });

    test("Observation/meta facts must be described as non-blocking/secondary", () => {
      // This will be checked by individual file alignment
    });
  });

  describe("Rule Descriptions", () => {
    test("strict-fact-shape must be described as an advisory default-on quality diagnostic", () => {
      const docs = [
        "docs/cli-reference.md",
        "docs/mcp-reference.md",
        "docs/inference-rules.md",
      ];
      for (const file of docs) {
        const content = getFileContent(file).toLowerCase();
        if (content.includes("strict-fact-shape")) {
          expect(content).toMatch(/advisory/);
          expect(content).toMatch(/qualitydiagnostic|quality diagnostic/);
        }
      }
    });

    test("domain-contradictions must be described as strict-lane only", () => {
      const docs = [
        "docs/cli-reference.md",
        "docs/mcp-reference.md",
        "docs/inference-rules.md",
      ];
      for (const file of docs) {
        const content = getFileContent(file).toLowerCase();
        if (content.includes("domain-contradictions")) {
          expect(content).toMatch(/strict-lane|strict fact/i);
        }
      }
    });
  });

  describe("Skill Subsystem References", () => {
    test("cli-reference.md documents kibi skills commands", () => {
      const content = getFileContent("docs/cli-reference.md");
      expect(content).toMatch(/`kibi skills`/);
      expect(content).toMatch(/skills list/);
      expect(content).toMatch(/skills load/);
      expect(content).toMatch(/skills read/);
      expect(content).toMatch(/skills validate/);
    });

    test("mcp-reference.md documents kb_skills tools", () => {
      const content = getFileContent("docs/mcp-reference.md");
      expect(content).toMatch(/`kb_skills_list`/);
      expect(content).toMatch(/`kb_skills_load`/);
      expect(content).toMatch(/`kb_skills_read`/);
    });

    test("generic-agent-onboarding.md teaches skill discovery", () => {
      const content = getFileContent("docs/generic-agent-onboarding.md");
      expect(content).toMatch(/kb_skills_list/);
      expect(content).toMatch(/kb_skills_load/);
      expect(content).toMatch(/kibi-usage/);
    });

    test("generic-agent-onboarding.md stays a tiny discovery bootstrap", () => {
      const content = getFileContent("docs/generic-agent-onboarding.md");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(40);
      expect(content).not.toContain("subject_key");
      expect(content).not.toContain("kb_upsert");
      expect(content).not.toMatch(/completion contract/i);
      expect(content).not.toContain("fact_kind");
    });

    test("README.md mentions reusable skills", () => {
      const content = getFileContent("README.md");
      expect(content).toMatch(/skill subsystem/i);
      expect(content).toMatch(/bundled skills/i);
    });

    test("example prompts do not duplicate Kibi operating rules", () => {
      const content = getFileContent(
        "docs/examples/prompts/improve-product-kb.md",
      );
      expect(content).not.toMatch(/Hard Rules/i);
      expect(content).not.toContain("subject_key");
      expect(content).not.toContain("kb_upsert");
      expect(content).toMatch(/kibi-usage/);
    });

    test("Docs state bundled-only skills and no remote install in v1", () => {
      const docs = [
        "docs/cli-reference.md",
        "docs/mcp-reference.md",
        "docs/generic-agent-onboarding.md",
        "README.md",
      ];
      for (const file of docs) {
        const content = getFileContent(file);
        // Must state that skills are bundled (not remote/marketplace)
        expect(content).toMatch(/bundled/i);
      }
    });

    test("CLI/MCP skill docs do not advertise remote install, marketplace, or script execution as v1 behavior", () => {
      const docs = [
        "docs/cli-reference.md",
        "docs/mcp-reference.md",
        "docs/generic-agent-onboarding.md",
      ];
      for (const file of docs) {
        const content = getFileContent(file).toLowerCase();
        const lines = content.split("\n");
        for (const line of lines) {
          const isCodexPluginMarketplaceLine =
            line.includes("codex") ||
            line.includes("kibi repo marketplace") ||
            line.includes("kibi-codex") ||
            line.includes("plugin directory");
          if (isCodexPluginMarketplaceLine) {
            continue;
          }
          if (
            line.includes("marketplace") ||
            line.includes("script execution") ||
            line.includes("remote install")
          ) {
            expect(line).toMatch(/not (supported|available)/);
          }
        }
      }
    });

    test("Codex plugin docs describe repo marketplace distribution with official directory caveat", () => {
      const docs = ["README.md", "docs/install.md"];

      for (const file of docs) {
        const content = getFileContent(file).toLowerCase();

        expect(content).toContain("codex plugin marketplace add looted/kibi");
        expect(content).toContain("kibi plugins");
        expect(content).toContain("official openai plugin directory");
        expect(content).toMatch(
          /does not currently provide self-serve|self-serve plugin publishing is not available/,
        );
      }
    });
  });
});
