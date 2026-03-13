// implements REQ-opencode-kibi-plugin-v1
import type { KibiConfig } from "./config";
import { isPluginEnabled } from "./config";

const SENTINEL = "<!-- kibi-opencode -->";

const GUIDENCE =
  SENTINEL +
  `
This project uses Kibi for traceability. Follow these rules:

**Before starting any work:** Run kb_query to find related requirements, ADRs, tests, and symbols. Never assume—verify first.

**While working:**
- Add "// implements REQ-xxx" comments to every new or modified function/class so the pre-commit hook can verify traceability.
- When creating KB entities (kb_upsert), include relationship rows in the same call: specified_by (req→scenario), verified_by (req→test), implements (symbol→req), covered_by (symbol→test).
- Never embed scenarios or tests inside a requirement record. Each must be a separate entity linked via relationships.

**After meaningful changes:** Run kb_check and fix all violations before continuing.

**Key principle:** Every line of code should be traceable to a requirement. Every requirement should have at least one test.
`;

// implements REQ-opencode-kibi-plugin-v1
export function buildPrompt(): string {
  return GUIDENCE.trim();
}

// implements REQ-opencode-kibi-plugin-v1
export function injectPrompt(current: string, config: KibiConfig): string {
  if (!config.prompt.enabled || !isPluginEnabled(config)) {
    return current;
  }
  if (current.includes(SENTINEL)) {
    return current;
  }
  return current + "\n\n" + GUIDENCE;
}

export { SENTINEL };
