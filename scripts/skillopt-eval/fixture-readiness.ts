import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  setupSeededFreshKb,
  stopFixtureEngine,
} from "./runtime/fixture-kb-setup";
import { probeStagedSymbolCapability } from "./runtime/symbol-capability-probe";

export type FixtureReadinessDependencies = Readonly<{
  setup: (workspace: string, cliRoot: string) => Promise<void>;
  stop: (workspace: string) => Promise<void>;
  /**
   * Probes the staged MCP runtime against the seeded workspace after its setup
   * engine stopped. Omitted, only the seeded setup is checked.
   */
  probeRuntime?: (workspace: string, sourceWorktree: string) => Promise<void>;
}>;

export const defaultFixtureReadinessDependencies: FixtureReadinessDependencies =
  {
    setup: setupSeededFreshKb,
    stop: stopFixtureEngine,
    probeRuntime: probeStagedSymbolCapability,
  };

// implements REQ-skillopt-codex-optimization
export async function probeFixtureReadiness(
  workspace: string,
  cliRoot: string,
  dependencies: FixtureReadinessDependencies = defaultFixtureReadinessDependencies,
): Promise<void> {
  // A fresh destination prevents a probe from reusing or deleting another run.
  await mkdir(workspace, { mode: 0o700 });
  await mkdir(join(workspace, "src"), { mode: 0o700 });
  await writeFile(
    join(workspace, "src", "fixture.ts"),
    'export const fixtureFamily = "readiness-probe";\n',
    "utf8",
  );
  try {
    await dependencies.setup(workspace, cliRoot);
    if (dependencies.probeRuntime !== undefined) {
      // The setup engine and the staged server must not share the branch
      // store, so stop the former before the probe starts the latter.
      await dependencies.stop(workspace);
      await dependencies.probeRuntime(workspace, resolve(cliRoot, "../.."));
    }
  } finally {
    await dependencies.stop(workspace);
    await rm(workspace, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const [workspace, cliRoot, ...extra] = process.argv.slice(2);
  if (!workspace || !cliRoot || extra.length > 0) {
    process.stderr.write(
      "Usage: fixture-readiness.ts NEW_WORKSPACE CLI_ROOT\n",
    );
    process.exitCode = 2;
  } else {
    probeFixtureReadiness(resolve(workspace), resolve(cliRoot))
      .then(() => {
        process.stdout.write("seeded-fixture-readiness:pass\n");
      })
      .catch((error) => {
        process.stderr.write(
          `${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exitCode = 1;
      });
  }
}
