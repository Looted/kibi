#!/usr/bin/env node
// post_tool hook. After read_file, grep or bash: the requirement rows for the
// code the call put in view, each requirement once per session (the shared
// read-context composer). After an edit: the firm-requirement notice and the
// Kibi entities linked to the edited file, so the model sees which
// requirement it implements and what must stay true.
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
import { isReadTool, postEditNote, readRowsNote } from "./kibi-guard.mjs";

try {
  const payload = await readStdinJson();
  if (payload?.tool_status !== "success") process.exit(0);
  const workspace = resolveHookWorkspace(payload);
  if (isReadTool(payload?.tool_name)) {
    const tool = String(payload?.tool_name ?? "").replace(/^file_system\./, "");
    const parts = [guardNote(readRowsNote, workspace, payload)];
    if (tool === "bash") {
      parts.push(guardNote(postEditNote, workspace, payload));
    }
    emitAdditionalContext(joinParts(parts));
  } else {
    await editContext(payload, workspace);
  }
} catch {
  // fail-open
}
process.exitCode = 0;

async function editContext(payload, workspace) {
  const input = payload?.tool_input ?? {};
  const file =
    input.file_path ?? input.path ?? input.new_path ?? input.newFilePath;
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
}
