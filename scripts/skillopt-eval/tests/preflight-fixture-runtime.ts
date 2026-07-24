import { sign } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HostProbe, PreflightFixture } from "./preflight-fixture";

export async function updateProbe(
  fixture: PreflightFixture,
  transform: (probe: HostProbe) => HostProbe,
): Promise<void> {
  const payload = transform(fixture.probe);
  const value = {
    payload,
    signature: sign(
      null,
      Buffer.from(JSON.stringify(payload)),
      fixture.privateKey,
    ).toString("base64"),
  };
  await chmod(fixture.probePath, 0o600);
  await writeFile(fixture.probePath, `${JSON.stringify(value, null, 2)}\n`);
  await chmod(fixture.probePath, 0o444);
}

export async function invokePreflight(
  fixture: PreflightFixture,
  overrides: Readonly<{
    sandboxLock?: string;
    providerLock?: string;
    verifierLock?: string;
    output?: string;
    env?: NodeJS.ProcessEnv;
  }> = {},
): Promise<Readonly<{ exitCode: number; output: unknown }>> {
  const output = overrides.output ?? fixture.output;
  const child = Bun.spawn(
    [
      "bun",
      "run",
      join(import.meta.dir, "..", "preflight.ts"),
      "--sandbox-lock",
      overrides.sandboxLock ?? fixture.sandboxLock,
      "--provider-lock",
      overrides.providerLock ?? fixture.providerLock,
      "--verifier-lock",
      overrides.verifierLock ?? fixture.verifierLock,
      "--artifact-root",
      fixture.artifactRoot,
      "--output",
      output,
      "--fixture-root",
      fixture.root,
    ],
    {
      env: {
        ...process.env,
        ...overrides.env,
        KIBI_SKILLOPT_TEST_FIXTURE: "1",
        KIBI_SKILLOPT_PREFLIGHT_SENTINEL: fixture.sentinel,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const exitCode = await child.exited;
  const text = await readFile(output, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return "null";
    throw error;
  });
  return { exitCode, output: JSON.parse(text) };
}
