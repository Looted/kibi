import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export type IsolationWorkspace = Readonly<{
  root: string;
  codexHome: string;
  sandboxHome: string;
  target: string;
  privateEvidence: string;
  privateScorer: string;
  siblingRun: string;
  cleanup: () => Promise<void>;
}>;

export type WorkspaceOptions = Readonly<{
  artifactRoot: string;
  runId: string;
  role: "optimizer" | "target";
}>;

function safeSegment(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) {
    throw new TypeError("runId must be a safe path segment");
  }
  return value;
}

// implements REQ-skillopt-codex-optimization
export async function createIsolationWorkspace(
  options: WorkspaceOptions,
): Promise<IsolationWorkspace> {
  const artifactRoot = resolve(options.artifactRoot);
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  const root = await mkdtemp(
    join(artifactRoot, `${safeSegment(options.runId)}-${options.role}-`),
  );
  await chmod(root, 0o700);
  const codexHome = join(root, "codex-home");
  const sandboxHome = join(root, "workspace", ".sandbox-home");
  const target = join(root, "workspace");
  const privateEvidence = join(root, "private-evidence");
  const privateScorer = join(root, "private-scorer");
  const siblingRun = join(root, "sibling-run");
  await Promise.all(
    [codexHome, sandboxHome, target, privateEvidence, privateScorer, siblingRun].map(
      async (directory) => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await chmod(directory, 0o700);
      },
    ),
  );
  await writeFile(join(privateScorer, "sentinel"), "private\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(join(siblingRun, "sentinel"), "sibling\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  let cleaned = false;
  return {
    root,
    codexHome,
    sandboxHome,
    target,
    privateEvidence,
    privateScorer,
    siblingRun,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      await rm(root, { recursive: true, force: true });
    },
  };
}
