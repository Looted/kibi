// kibi-common.mjs — shared plumbing for the Kibi hooks.
//
// Each hook reads its JSON payload from stdin, calls the kibi CLI through
// ../kibi.mjs (which detects WSL vs direct runtime automatically), and prints
// a Vibe structured-response JSON on stdout. Every failure path exits 0 with
// no output, so a broken hook never blocks the session (fail-open).
import { spawn } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isKibiWorkspace, resolveWorkspace } from "../kibi-runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIBI_RUNNER = join(HERE, "..", "kibi.mjs");

export function readStdinJson() {
  return new Promise((resolvePromise) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolvePromise(JSON.parse(raw));
      } catch {
        resolvePromise(null);
      }
    });
    process.stdin.on("error", () => resolvePromise(null));
  });
}

/**
 * Resolve the Kibi workspace for a hook payload: the payload's `cwd` walked up
 * to the repo root (bounded by .git), or the env/pointer fallbacks in
 * resolveWorkspace. Hooks must anchor at the workspace root, not the raw
 * payload cwd, so sessions started in a subdirectory still match files.
 */
export function resolveHookWorkspace(payload) {
  return resolveWorkspace(payload?.cwd || process.cwd(), process.env).root;
}

/**
 * Make `filePath` relative to the workspace root (forward slashes). Returns
 * null when the file lives outside the workspace.
 */
export function toRepoRelative(filePath, workspaceRoot) {
  const norm = (p) => String(p ?? "").replace(/\\/g, "/");
  const file = norm(filePath);
  if (!file) return null;
  const root = norm(workspaceRoot).replace(/\/+$/, "");
  if (/^[a-zA-Z]:\//.test(file) || file.startsWith("//")) {
    // Absolute Windows path: relativize only when it sits inside the root.
    if (root && file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
      return file.slice(root.length + 1);
    }
    return null;
  }
  if (root && file.startsWith(`${root}/`)) return file.slice(root.length + 1);
  const rel = relative(root, file);
  return rel && !rel.startsWith("..") ? rel : null;
}

/**
 * Run a kibi CLI route in `workspace` and resolve with { code, stdout }.
 * Exit code 3 means the workspace has no .kb (hooks treat it as "skip").
 */
export function runKibi(workspace, routeArgs, payload) {
  return new Promise((resolvePromise) => {
    let child;
    try {
      child = spawn(process.execPath, [KIBI_RUNNER, ...routeArgs], {
        env: {
          ...process.env,
          KIBI_AUTO_SYNC: process.env.KIBI_AUTO_SYNC ?? "0",
          KIBI_WORKSPACE: workspace,
        },
        stdio: ["pipe", "pipe", "inherit"],
      });
    } catch {
      resolvePromise({ code: 1, stdout: "" });
      return;
    }
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stdin.on("error", () => {
      // The child may exit before consuming stdin; ignore EPIPE.
    });
    child.once("error", () => resolvePromise({ code: 1, stdout }));
    child.once("close", (code) => resolvePromise({ code: code ?? 1, stdout }));
    const wantsInput =
      routeArgs.includes("--input") &&
      routeArgs[routeArgs.indexOf("--input") + 1] === "-";
    // Always close stdin: a route that does not read it must not hang the hook.
    child.stdin.end(wantsInput ? `${JSON.stringify(payload ?? {})}\n` : "");
  });
}

/** Emit a Vibe structured response adding context for the model. */
export function emitAdditionalContext(text) {
  if (!text) return;
  process.stdout.write(
    `${JSON.stringify({ hook_specific_output: { additional_context: text } })}\n`,
  );
}

/** Parse a kibi CLI JSON envelope (or raw JSON) into its data payload. */
export function parseKibiData(stdout) {
  const parsed = JSON.parse(stdout);
  if (parsed && typeof parsed === "object" && "data" in parsed)
    return parsed.data;
  return parsed;
}

export function clip(text, max) {
  const one = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

/**
 * Run one of the kibi-guard.mjs notes for a Kibi workspace. The guard is
 * advisory: outside a KB, or on any error, it adds nothing.
 */
export function guardNote(note, workspace, payload) {
  try {
    if (!isKibiWorkspace(workspace)) return undefined;
    return note(workspace, payload, process.env) || undefined;
  } catch {
    return undefined;
  }
}

/** Join the context parts that are set; empty when none is. */
export function joinParts(parts) {
  return parts.filter((part) => typeof part === "string" && part).join("\n\n");
}
