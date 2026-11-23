#!/usr/bin/env node
// session_start hook: summarize the attached Kibi KB for the model.
// Payload: { hook_event_name: "session_start", cwd, source, ... }
import {
  emitAdditionalContext,
  guardNote,
  joinParts,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
} from "./kibi-common.mjs";
import { sessionStartNote } from "./kibi-guard.mjs";

try {
  const payload = await readStdinJson();
  const workspace = resolveHookWorkspace(payload);
  const guard = guardNote(sessionStartNote, workspace, payload);
  const res = await runKibi(workspace, ["status", "--format", "json"]);
  if (res.code !== 0) process.exit(0);
  const status = parseKibiData(res.stdout);
  if (!status || typeof status !== "object") process.exit(0);
  const lines = [
    `Kibi KB attached at this workspace: branch ${String(status.branch ?? "?")}, ` +
      `${status.dirty ? "dirty" : "clean"}, ${Number(status.staleReasonCount ?? 0)} stale reason(s).`,
    "Discovery: kb_search (plain question) first, then kb_query for exact id/type/sourceFile lookups; " +
      "load the bundled skill with kb_skills {action:'load', id:'kibi-usage'} before Kibi mutations.",
  ];
  emitAdditionalContext(joinParts([lines.join("\n"), guard]));
} catch {
  // fail-open
}
process.exitCode = 0;
