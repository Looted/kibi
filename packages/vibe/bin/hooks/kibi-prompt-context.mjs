#!/usr/bin/env node
// pre_agent hook: search the Kibi KB for the prompt and inject the governing
// entities as additional context. Payload: { hook_event_name: "pre_agent", prompt, cwd, ... }
import {
  clip,
  emitAdditionalContext,
  guardNote,
  joinParts,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
} from "./kibi-common.mjs";
import { promptNote } from "./kibi-guard.mjs";

const MAX_SEARCH_PROMPT_CHARS = 2000;

try {
  const payload = await readStdinJson();
  const prompt = String(payload?.prompt ?? "").trim();
  if (!prompt) process.exit(0);
  const workspace = resolveHookWorkspace(payload);
  // The rule note comes first and stands on its own: a prompt that states a
  // rule gets it even when the search finds nothing.
  const rule = guardNote(promptNote, workspace, payload);
  // A very long prompt is not a search query: it keeps the rule note but
  // skips the KB search.
  const res =
    prompt.length > MAX_SEARCH_PROMPT_CHARS
      ? null
      : await runKibi(workspace, ["search", "--input", "-"], {
          query: prompt,
          limit: 5,
        });
  const data = res?.code === 0 ? parseKibiData(res.stdout) : null;
  const results = Array.isArray(data?.results) ? data.results : [];
  const lines = results.slice(0, 5).map((hit) => {
    const e = hit?.entity ?? {};
    return `- ${e.id} (${e.type}, ${e.status}): ${clip(e.title, 140)}`;
  });
  emitAdditionalContext(
    joinParts([
      rule,
      lines.length === 0
        ? undefined
        : [
            "Kibi KB hits relevant to this request:",
            ...lines,
            "Use kb_query for exact lookup before any kb_upsert.",
          ].join("\n"),
    ]),
  );
} catch {
  // fail-open
}
process.exitCode = 0;
