import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { RuntimePrerequisiteError } from "./canary-errors";
import { type CapabilityProbeEvidence, sha256File } from "./canary-evidence";
import type { IsolationWorkspace } from "./isolation-workspace";
import type { ProcessResult } from "./process";

const SANDBOX_PROBE_OUTPUT = "skillopt-sandbox-probe:pass";
const STARTUP_TIMEOUT_MS = 15_000;

export function sourceIsolationDeniedPaths(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  realCodexHome: string,
): readonly string[] {
  return [
    join(realCodexHome, "auth.json"),
    // Agent command_execution mounts PATH aliases under private CODEX_HOME/tmp,
    // so the directory itself is readable. Secrets beside that mount must stay denied.
    join(workspace.codexHome, "auth.json"),
    join(workspace.codexHome, "config.toml"),
    join(sourceWorktree, "packages/mcp/dist/server.js"),
    join(sourceWorktree, "packages/cli/dist/cli.js"),
    join(sourceWorktree, "packages/core/src/kb.pl"),
    join(sourceWorktree, "node_modules/typescript/package.json"),
    join(sourceWorktree, ".kb/config.json"),
    workspace.privateScorer,
    workspace.privateEvidence,
    workspace.siblingRun,
    "/tmp",
    "/var/tmp",
  ];
}

export function buildCodexSandboxProbeArgv(
  options: Readonly<{
    codexCommand: string;
    workspace: string;
    probe?: CapabilityProbeEvidence;
  }>,
): readonly [string, ...string[]] {
  const command = options.probe
    ? [options.probe.absolutePath]
    : ["/bin/sh", "-c", `printf ${SANDBOX_PROBE_OUTPUT}`];
  return [
    options.codexCommand,
    "sandbox",
    "--permission-profile",
    "skillopt-isolated",
    "--cd",
    options.workspace,
    ...command,
  ];
}

export async function probeCodexSandbox(
  options: Readonly<{
    codexCommand: string;
    workspace: string;
    env: NodeJS.ProcessEnv;
    probe?: CapabilityProbeEvidence;
    run: (
      argv: readonly [string, ...string[]],
      cwd: string,
      env: NodeJS.ProcessEnv,
      timeoutMs: number,
    ) => Promise<ProcessResult>;
  }>,
): Promise<void> {
  const result = await options.run(
    buildCodexSandboxProbeArgv(options),
    options.workspace,
    options.env,
    STARTUP_TIMEOUT_MS,
  );
  const expectedOutput = options.probe?.expectedOutput ?? SANDBOX_PROBE_OUTPUT;
  if (result.exitCode !== 0 || result.stdout !== expectedOutput) {
    throw new RuntimePrerequisiteError(
      options.probe ? "source_isolation_probe_failed" : "sandbox_probe_failed",
    );
  }
}

export async function writeCapabilityProbe(
  workspace: IsolationWorkspace,
  deniedPaths: readonly string[],
): Promise<CapabilityProbeEvidence> {
  const quoted = deniedPaths.map((path) => JSON.stringify(path)).join(" ");
  const sandboxHome = JSON.stringify(workspace.sandboxHome);
  const expectedOutput = "skillopt-capability-canary:pass\n";
  const probe = `#!/bin/sh\nset -u\nfor p in ${quoted}; do test ! -r "$p" || exit 41; done\ntest -d ${sandboxHome} || exit 44\nprintf sandbox > ${sandboxHome}/skillopt-home-write-proof || exit 45\nif printf runtime > "$PWD/.runtime/write-proof" 2>/dev/null; then exit 47; fi\nskills=0\nfor p in "$PWD"/.agents/skills/*/SKILL.md; do test -r "$p" && skills=$((skills+1)); done\ntest "$skills" -eq 4 || exit 42\nprintf canary > "$PWD/write-proof"\nif python3 -c 'import socket; socket.create_connection(("example.com",80),1)' >/dev/null 2>&1; then exit 43; fi\nprintf '${expectedOutput}'\n`;
  const path = resolve(workspace.target, ".runtime/canary-probe");
  await mkdir(resolve(workspace.target, ".runtime"), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path, probe, { encoding: "utf8", mode: 0o500 });
  await chmod(path, 0o500);
  return {
    absolutePath: path,
    command: "./.runtime/canary-probe",
    expectedOutput,
    sha256: await sha256File(path),
  };
}
