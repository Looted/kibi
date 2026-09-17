// implements REQ-zcode-kibi-plugin-v1
// Shared, serialized package build for tests that need built artifacts
// (manifest copy check, install/pack smoke tests). Multiple test files can
// trigger builds; `dist/` is rm-rf'd by the build, so concurrent invocations
// would race — the invocations are serialized with a lock file and
// deduplicated within a worker.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const LOCK_TIMEOUT_MS = 180_000;
const LOCK_POLL_MS = 100;

let builtInThisWorker = false;

function withBuildLock<T>(lockPath: string, operation: () => T): T {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      const handle = fs.openSync(lockPath, "wx");
      try {
        return operation();
      } finally {
        fs.closeSync(handle);
        fs.rmSync(lockPath, { force: true });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for build lock ${lockPath}`);
      }
      try {
        const stats = fs.statSync(lockPath);
        if (Date.now() - stats.mtimeMs > LOCK_TIMEOUT_MS) {
          // Stale lock from a killed worker: break it.
          fs.rmSync(lockPath, { force: true });
        }
      } catch {
        // Vanished between stat and inspect: retry immediately.
      }
      Bun.sleepSync(LOCK_POLL_MS);
    }
  }
}

export function buildZcodePackageOnce(packageRoot: string): void {
  if (builtInThisWorker) {
    return;
  }

  const distRoot = path.join(packageRoot, "dist");
  fs.mkdirSync(distRoot, { recursive: true });
  const lockPath = path.join(distRoot, ".test-build.lock");
  withBuildLock(lockPath, () => {
    execSync("bun run build", { cwd: packageRoot, stdio: "ignore" });
  });
  builtInThisWorker = true;
}
