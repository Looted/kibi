#!/usr/bin/env node
// kibi.mjs — run a kibi CLI JSON route with automatic runtime detection.
//
// Usage: node kibi.mjs <route> [routeArgs...]
//   e.g. node kibi.mjs search --input -      (JSON payload on stdin)
//        node kibi.mjs status --format json
// The workspace is KIBI_WORKSPACE (then KIBI_PROJECT_ROOT/KIBI_ROOT), the cwd
// walk bounded by .git, or a kibi-workspace.txt pointer next to
// kibi-runtime.mjs (see resolveWorkspace). Exit code 3 means the workspace
// has no .kb — it is returned before any process is spawned, so hooks stay
// silent and cheap outside Kibi repos. stdout is passed through untouched so
// callers can parse the JSON envelope.
import {
  NO_KIBI_EXIT_CODE,
  isKibiWorkspace,
  planRuntime,
  resolveWorkspace,
  spawnKibiCli,
} from "./kibi-runtime.mjs";

const routeArgs = process.argv.slice(2);
if (routeArgs.length === 0) {
  process.stderr.write("usage: node kibi.mjs <route> [routeArgs...]\n");
  process.exit(2);
}

const env = process.env;
const workspace = resolveWorkspace(process.cwd(), env);
if (!isKibiWorkspace(workspace.root)) {
  process.exit(NO_KIBI_EXIT_CODE);
}

let child;
try {
  const plan = planRuntime(workspace.root, env);
  child = spawnKibiCli(plan, routeArgs, { env });
} catch (error) {
  process.stderr.write(
    `[kibi-vibe] Failed to start kibi for ${workspace.root}: ` +
      `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const wantsStdin =
  routeArgs.includes("--input") &&
  routeArgs[routeArgs.indexOf("--input") + 1] === "-";

child.stdin.on("error", () => {
  // The child may exit before stdin is fully consumed (e.g. a fast error);
  // an EPIPE here must not crash the runner.
});

if (wantsStdin) {
  process.stdin.pipe(child.stdin);
} else {
  child.stdin.end();
}

child.once("error", (error) => {
  process.stderr.write(`[kibi-vibe] Failed to start kibi: ${error.message}\n`);
  process.exit(1);
});

child.once("close", (code) => {
  process.exit(code ?? 1);
});
