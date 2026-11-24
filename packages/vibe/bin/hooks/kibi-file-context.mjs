#!/usr/bin/env node
// post_tool hook (read_file/edit/write_file): after a file is read or written,
// append the Kibi entities linked to that source file, so the model sees which
// requirement a file implements and what must stay true.
// Payload: { hook_event_name: "post_tool", tool_name, tool_input, tool_status, cwd, ... }
import {
  clip,
  emitAdditionalContext,
  guardNote,
  joinParts,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
  toRepoRelative,
} from "./kibi-common.mjs";
import { postEditNote } from "./kibi-guard.mjs";

try {
  const payload = await readStdinJson();
  if (payload?.tool_status !== "success") process.exit(0);
  const input = payload?.tool_input ?? {};
  const file =
    input.file_path ?? input.path ?? input.new_path ?? input.newFilePath;
  const workspace = resolveHookWorkspace(payload);
  // After an edit: the firm-requirement notice and the rule-capture
  // template, ahead of the linked entities. The guard reads the edit's own
  // paths, so it runs before (and independently of) the entity lookup.
  const guard = guardNote(postEditNote, workspace, payload);
  // A relative tool path is relative to the folder the tool ran in.
  const rel = toRepoRelative(file, workspace, payload?.cwd);
  let lines = [];
  if (rel) {
    const res = await runKibi(workspace, ["query", "--input", "-"], {
      sourceFile: rel,
      limit: 10,
    });
    const data = res.code === 0 ? parseKibiData(res.stdout) : null;
    const entities = Array.isArray(data?.entities) ? data.entities : [];
    lines = entities
      .slice(0, 8)
      .map((e) => `- ${e.id} (${e.type}, ${e.status}): ${clip(e.title, 140)}`);
  }
  emitAdditionalContext(
    joinParts([
      guard,
      lines.length === 0
        ? undefined
        : `Kibi entities linked to ${rel}:\n${lines.join("\n")}`,
    ]),
  );
} catch {
  // fail-open
}
process.exitCode = 0;
