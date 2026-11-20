#!/usr/bin/env node
// post_tool hook (read_file/edit/write_file): after a file is read or written,
// append the Kibi entities linked to that source file, so the model sees which
// requirement a file implements and what must stay true.
// Payload: { hook_event_name: "post_tool", tool_name, tool_input, tool_status, cwd, ... }
import {
  clip,
  emitAdditionalContext,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
  toRepoRelative,
} from "./kibi-common.mjs";

try {
  const payload = await readStdinJson();
  if (payload?.tool_status !== "success") process.exit(0);
  const input = payload?.tool_input ?? {};
  const file =
    input.file_path ?? input.path ?? input.new_path ?? input.newFilePath;
  const workspace = resolveHookWorkspace(payload);
  const rel = toRepoRelative(file, workspace);
  if (!rel) process.exit(0);
  const res = await runKibi(workspace, ["query", "--input", "-"], {
    sourceFile: rel,
    limit: 10,
  });
  if (res.code !== 0) process.exit(0);
  const data = parseKibiData(res.stdout);
  const entities = Array.isArray(data?.entities) ? data.entities : [];
  const lines = entities
    .slice(0, 8)
    .map((e) => `- ${e.id} (${e.type}, ${e.status}): ${clip(e.title, 140)}`);
  if (lines.length === 0) process.exit(0);
  emitAdditionalContext(`Kibi entities linked to ${rel}:\n${lines.join("\n")}`);
} catch {
  // fail-open
}
process.exitCode = 0;
