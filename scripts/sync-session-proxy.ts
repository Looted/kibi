/**
 * Copies scripts/launcher-shared/kibi-session-proxy.js into every host MCP
 * launcher between the kibi-session-proxy markers.
 *
 * Launchers must stay self-contained files (Codex inlines its launcher into
 * .mcp.json as `node -e`), so the shared session proxy cannot be imported at
 * run time. One canonical copy plus this sync keeps them identical.
 *
 *   bun run scripts/sync-session-proxy.ts --write   rewrite the launchers
 *   bun run scripts/sync-session-proxy.ts --check   fail if any copy drifted
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");
const sourcePath = path.join(
  repoRoot,
  "scripts",
  "launcher-shared",
  "kibi-session-proxy.js",
);

export const SESSION_PROXY_LAUNCHERS = [
  "packages/claude/bin/mcp-launcher.cjs",
  "packages/codex/bin/mcp-launcher.cjs",
  "packages/cursor/bin/launch-kibi-mcp.mjs",
  "packages/zcode/bin/mcp-launcher.cjs",
] as const;

export const BEGIN_MARKER =
  "// >>> kibi-session-proxy: generated from scripts/launcher-shared/kibi-session-proxy.js; run `bun run sync:session-proxy`";
export const END_MARKER = "// <<< kibi-session-proxy";

export function sessionProxyBlock(): string {
  const source = fs.readFileSync(sourcePath, "utf8").trimEnd();
  return `${BEGIN_MARKER}\n${source}\n${END_MARKER}`;
}

/** The launcher with its marked block replaced by `block`. */
export function embedSessionProxy(launcher: string, block: string): string {
  const begin = launcher.indexOf(BEGIN_MARKER);
  const end = launcher.indexOf(END_MARKER);
  if (begin < 0 || end < begin) {
    throw new Error("launcher has no kibi-session-proxy markers");
  }
  return `${launcher.slice(0, begin)}${block}${launcher.slice(end + END_MARKER.length)}`;
}

function main(): void {
  const mode = process.argv.includes("--write") ? "write" : "check";
  const block = sessionProxyBlock();
  const drifted: string[] = [];
  for (const relative of SESSION_PROXY_LAUNCHERS) {
    const file = path.join(repoRoot, relative);
    const current = fs.readFileSync(file, "utf8");
    const next = embedSessionProxy(current, block);
    if (next === current) continue;
    if (mode === "write") fs.writeFileSync(file, next);
    else drifted.push(relative);
  }
  if (drifted.length > 0) {
    console.error(
      `kibi-session-proxy drifted in: ${drifted.join(", ")}. Run \`bun run sync:session-proxy\`.`,
    );
    process.exit(1);
  }
}

if (import.meta.main) main();
