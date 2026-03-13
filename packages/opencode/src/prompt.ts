// implements REQ-opencode-kibi-plugin-v1
import type { KibiConfig } from "./config";
import { isPluginEnabled } from "./config";

const SENTINEL = "<!-- kibi-opencode -->";

const GUIDENCE = `
${SENTINEL}
Query Kibi before design/implementation work. Prefer kb_query/kb_check for context. Update KB artifacts after relevant changes. Remember symbol traceability requirements.
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
