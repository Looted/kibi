// Bundle src/guard.ts with kibi-agent-core into bin/hooks/kibi-guard.mjs.
// A copied Vibe plugin has no node_modules, so the hooks import this
// self-contained file. The bundle is tracked; CI checks it is current.
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const result = await Bun.build({
  entrypoints: [path.join(packageRoot, "src", "guard.ts")],
  outdir: path.join(packageRoot, "bin", "hooks"),
  naming: "kibi-guard.mjs",
  target: "node",
  format: "esm",
  packages: "bundle",
  sourcemap: "none",
});

if (!result.success) {
  throw new Error(
    result.logs.map((log) => log.message).join("\n") || "Bun build failed",
  );
}
