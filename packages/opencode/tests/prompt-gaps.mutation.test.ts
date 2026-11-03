import { describe, expect, test } from "bun:test";
import path from "node:path";
import { SENTINEL, buildPrompt } from "../src/prompt";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const supported = { supported: true as const, pluginVersion: "1.0.0" };

describe("buildPrompt edge cases", () => {
  test("a host without command injection is pointed at the MCP command", () => {
    expect(
      buildPrompt(
        { recentEdits: [], posture: "root_uninitialized" },
        { supported: false, reason: "no hooks" },
      ),
    ).toBe(
      `${SENTINEL}\n\n🔧 **Bootstrap required**\n\nKibi infrastructure is not initialized. Run \`kibi init\`, then inspect \`kb_status.bootstrap.nextAction\` and route the explicit bootstrap request to the canonical \`kibi-bootstrap\` skill. Use \`/kibi:kibi-bootstrap:mcp\`; this host does not support native command injection.`,
    );
  });

  test("freshness alone is the whole block", () => {
    expect(
      buildPrompt(
        {
          recentEdits: [],
          posture: "root_active",
          kbFreshness: {
            state: "evidence-required",
            requiresEvidence: true,
            allowsCompletion: false,
            reason: "Because.",
            missingEvidence: [],
          },
        },
        supported,
      ),
    ).toBe(
      [
        SENTINEL,
        "",
        "🧠 **Kibi freshness required**",
        "State: evidence-required. Because.",
        "Resolution:",
        "- **KB updated**: run `kb_search` for discovery, then `kb_upsert`/`kb_delete` for mutations, then `kb_check`.",
        "- **No KB impact**: include a no-impact rationale in your final report after source-linked discovery via `kb_search`/`kb_query(sourceFile=...)` and `kb_check`.",
      ].join("\n"),
    );
  });

  test("an absolute focus path finds the same source links", () => {
    const context = (file: string) => ({
      recentEdits: [{ path: file, kind: "code" as const }],
      focusEdit: { path: file, kind: "code" as const },
      posture: "root_active" as const,
      riskClass: "behavior_candidate" as const,
      workspaceRoot: REPO_ROOT,
    });
    const relative = buildPrompt(
      context("packages/opencode/src/prompt.ts"),
      supported,
    );
    expect(relative).toContain("- Existing Kibi links: ");
    expect(
      buildPrompt(
        context(path.join(REPO_ROOT, "packages/opencode/src/prompt.ts")),
        supported,
      ),
    ).toBe(relative);
  });
});
