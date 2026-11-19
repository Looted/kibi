#!/usr/bin/env node
// pre_agent hook: search the Kibi KB for the prompt and inject the governing
// entities as additional context. Payload: { hook_event_name: "pre_agent", prompt, cwd, ... }
import {
  clip,
  emitAdditionalContext,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
} from "./kibi-common.mjs";

try {
  const payload = await readStdinJson();
  const prompt = String(payload?.prompt ?? "").trim();
  if (!prompt || prompt.length > 2000) process.exit(0);
  const workspace = resolveHookWorkspace(payload);
  const res = await runKibi(workspace, ["search", "--input", "-"], {
    query: prompt,
    limit: 5,
  });
  if (res.code !== 0) process.exit(0);
  const data = parseKibiData(res.stdout);
  const results = Array.isArray(data?.results) ? data.results : [];
  const lines = results.slice(0, 5).map((hit) => {
    const e = hit?.entity ?? {};
    return `- ${e.id} (${e.type}, ${e.status}): ${clip(e.title, 140)}`;
  });
  if (lines.length === 0) process.exit(0);
  emitAdditionalContext(
    [
      "Kibi KB hits relevant to this request:",
      ...lines,
      "Use kb_query for exact lookup before any kb_upsert.",
    ].join("\n"),
  );
} catch {
  // fail-open
}
process.exitCode = 0;
