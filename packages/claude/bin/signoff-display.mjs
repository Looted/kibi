#!/usr/bin/env node

// src/signoff-display.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
var SIGNOFF_DISPLAY_ENV = "KIBI_SIGNOFF_DISPLAY";
var OPEN_FENCE = /^\s*```kibi-(?:signoff|questions)\s*$/;
var CLOSE_FENCE = /^\s*```\s*$/;
function unwrapSignoffFences(delta, open) {
  if (!open && !delta.includes("```kibi-"))
    return { open: false };
  const lines = delta.split(/(?<=\n)/);
  const kept = [];
  let inside = open;
  let changed = false;
  for (const line of lines) {
    const bare = line.replace(/\r?\n$/, "");
    if (!inside && OPEN_FENCE.test(bare)) {
      inside = true;
      changed = true;
      continue;
    }
    if (inside && CLOSE_FENCE.test(bare)) {
      inside = false;
      changed = true;
      continue;
    }
    kept.push(line);
  }
  return changed ? { displayContent: kept.join(""), open: inside } : { open: inside };
}
function stateFile(messageId) {
  const safe = messageId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return path.join(os.tmpdir(), `kibi-signoff-display-${safe || "message"}`);
}
function parseBatch(raw) {
  try {
    const input = JSON.parse(raw);
    if (typeof input.delta !== "string")
      return;
    return {
      messageId: typeof input.message_id === "string" ? input.message_id : "",
      delta: input.delta,
      final: input.final === true
    };
  } catch {
    return;
  }
}
function handleDisplayBatch(raw, env = process.env) {
  if (env[SIGNOFF_DISPLAY_ENV] === "0")
    return "";
  const batch = parseBatch(raw);
  if (!batch)
    return "";
  const file = stateFile(batch.messageId);
  const wasOpen = batch.messageId !== "" && fs.existsSync(file);
  const result = unwrapSignoffFences(batch.delta, wasOpen);
  try {
    if (result.open && !batch.final && batch.messageId !== "") {
      if (!wasOpen)
        fs.writeFileSync(file, "1");
    } else if (wasOpen) {
      fs.rmSync(file, { force: true });
    }
  } catch {}
  if (result.displayContent === undefined)
    return "";
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "MessageDisplay",
      displayContent: result.displayContent
    }
  });
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}
if (isInvokedAsCli(process.argv[1], import.meta.url)) {
  try {
    const output = handleDisplayBatch(fs.readFileSync(0, "utf8"));
    if (output)
      process.stdout.write(`${output}
`);
  } catch {}
}
export {
  SIGNOFF_DISPLAY_ENV,
  handleDisplayBatch,
  unwrapSignoffFences
};
