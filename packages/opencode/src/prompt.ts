// implements REQ-opencode-kibi-plugin-v1
import type { KibiConfig } from "./config";
import { isPluginEnabled } from "./config";

const SENTINEL = "<!-- kibi-opencode -->";

const GUIDANCE = `${SENTINEL}
This project uses Kibi (via MCP). Prefer storing durable knowledge in Kibi over code comments.

Before changing behavior: query Kibi by sourceFile, id, type, or tags; do not rely on undocumented tools.

Keep changed symbols traceable with 

// implements REQ-xxx

Run kb_check after KB mutations.

**Kibi-first workflow:**
1. **Discover**: Run kb_query with filters (sourceFile, type, tags) to find related requirements, ADRs, tests, and symbols.
2. **Document intent**: If you are about to explain code, STOP. Route that explanation to kb_upsert instead of inline comments.
3. **Link during work**: When creating KB entities, include relationship rows: specified_by (req→scenario), verified_by (req→test), implements (symbol→req), covered_by (symbol→test).
4. **Validate**: Run kb_check after KB mutations to catch violations early.

**Public Kibi tools only:** kb_query, kb_upsert, kb_delete, kb_check.

**Traceability:** Every new or modified function/class should have 

// implements REQ-xxx

so the pre-commit hook can verify coverage.
`;

// implements REQ-opencode-kibi-plugin-v1
export function buildPrompt(): string {
  return GUIDANCE.trim();
}

// implements REQ-opencode-kibi-plugin-v1
export function injectPrompt(current: string, config: KibiConfig): string {
  if (!config.prompt.enabled || !isPluginEnabled(config)) {
    return current;
  }
  if (current.includes(SENTINEL)) {
    return current;
  }
  return `${current}\n\n${GUIDANCE}`;
}

export { SENTINEL };
