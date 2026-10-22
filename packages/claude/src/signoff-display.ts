#!/usr/bin/env node
// implements REQ-kibi-signoff-views
/**
 * Claude Code `MessageDisplay` hook for Kibi signoff views. Agents paste
 * `kibi signoff` output as a fenced block (```kibi-signoff or
 * ```kibi-questions) so every host can find it; Claude Code would show that
 * fence as raw code. This hook drops the fence lines on screen so the Markdown
 * inside renders as headings, quotes and lists. It is display-only: the
 * transcript and the model keep the original text.
 *
 * It runs for every streamed batch of assistant text, so it stays tiny: no
 * Kibi imports, and an immediate exit when the batch has no fence and no
 * fence is open from an earlier batch of the same message.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SIGNOFF_DISPLAY_ENV = "KIBI_SIGNOFF_DISPLAY";

const OPEN_FENCE = /^\s*```kibi-(?:signoff|questions)\s*$/;
const CLOSE_FENCE = /^\s*```\s*$/;

export type DisplayBatch = Readonly<{
  messageId: string;
  delta: string;
  final: boolean;
}>;

export type DisplayResult = Readonly<{
  /** The text to show instead of the batch, or undefined to show it as is. */
  displayContent?: string;
  /** Whether a signoff fence is still open after this batch. */
  open: boolean;
}>;

// implements REQ-kibi-signoff-views
/**
 * Remove signoff fence lines from one batch. `open` says whether a fence was
 * left open by an earlier batch of the same message.
 */
export function unwrapSignoffFences(
  delta: string,
  open: boolean,
): DisplayResult {
  if (!open && !delta.includes("```kibi-")) return { open: false };
  const lines = delta.split(/(?<=\n)/);
  const kept: string[] = [];
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
  return changed
    ? { displayContent: kept.join(""), open: inside }
    : { open: inside };
}

function stateFile(messageId: string): string {
  const safe = messageId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return path.join(os.tmpdir(), `kibi-signoff-display-${safe || "message"}`);
}

function parseBatch(raw: string): DisplayBatch | undefined {
  try {
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (typeof input.delta !== "string") return undefined;
    return {
      messageId: typeof input.message_id === "string" ? input.message_id : "",
      delta: input.delta,
      final: input.final === true,
    };
  } catch {
    return undefined;
  }
}

// implements REQ-kibi-signoff-views
/** Handle one `MessageDisplay` call; returns the hook's JSON output. */
export function handleDisplayBatch(
  raw: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env[SIGNOFF_DISPLAY_ENV] === "0") return "";
  const batch = parseBatch(raw);
  if (!batch) return "";
  const file = stateFile(batch.messageId);
  const wasOpen = batch.messageId !== "" && fs.existsSync(file);
  const result = unwrapSignoffFences(batch.delta, wasOpen);
  try {
    if (result.open && !batch.final && batch.messageId !== "") {
      if (!wasOpen) fs.writeFileSync(file, "1");
    } else if (wasOpen) {
      fs.rmSync(file, { force: true });
    }
  } catch {
    // State is best effort: without it a later batch shows the closing fence.
  }
  if (result.displayContent === undefined) return "";
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "MessageDisplay",
      displayContent: result.displayContent,
    },
  });
}

function isInvokedAsCli(argv1: string | undefined, moduleUrl: string): boolean {
  const invokedPath = argv1 ? pathToFileURL(path.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}

if (isInvokedAsCli(process.argv[1], import.meta.url)) {
  try {
    const output = handleDisplayBatch(fs.readFileSync(0, "utf8"));
    if (output) process.stdout.write(`${output}\n`);
  } catch {
    // Display hooks never block: on any error the original text is shown.
  }
}
