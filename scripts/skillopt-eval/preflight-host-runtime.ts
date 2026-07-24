import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { EXTERNAL_ROOT, LAUNCHER } from "./preflight-contracts";
import type { HostPreflightOptions } from "./preflight-host-model";
import { PreflightInputError, validateTrustDirectory } from "./preflight-io";

export function externalPath(
  options: HostPreflightOptions,
  suffix: string,
): string {
  return options.fixtureRoot === undefined
    ? join(EXTERNAL_ROOT, suffix)
    : join(options.fixtureRoot, "etc", "kibi-skillopt", suffix);
}

export async function validateTrustRoot(
  options: HostPreflightOptions,
): Promise<void> {
  const fixtureRoot = options.fixtureRoot;
  const expectedUid =
    fixtureRoot === undefined ? 0 : (process.getuid?.() ?? -1);
  const paths =
    fixtureRoot === undefined
      ? ["/", "/etc", EXTERNAL_ROOT, join(EXTERNAL_ROOT, "protocol-v1")]
      : [
          fixtureRoot,
          join(fixtureRoot, "etc"),
          join(fixtureRoot, "etc", "kibi-skillopt"),
          join(fixtureRoot, "etc", "kibi-skillopt", "protocol-v1"),
        ];
  for (const path of paths) await validateTrustDirectory(path, expectedUid);
}

export async function loadAttestation(
  options: HostPreflightOptions,
): Promise<string> {
  if (options.fixtureRoot !== undefined)
    return readFile(externalPath(options, "fixture-preflight.json"), "utf8");
  if (process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL !== undefined)
    await Bun.write(
      process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL,
      "launcher-spawned\n",
    );
  const child = Bun.spawn([LAUNCHER, "preflight", "--format", "json"], {
    env: {},
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 30_000);
  try {
    const [stdout, , exitCode] = await Promise.all([
      readBounded(child.stdout),
      readBounded(child.stderr),
      child.exited,
    ]);
    if (exitCode !== 0)
      throw new PreflightInputError("launcher-probe", "PREFLIGHT_NO_GO");
    return stdout;
  } finally {
    clearTimeout(timeout);
  }
}

async function readBounded(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) return Buffer.concat(chunks).toString("utf8");
      size += result.value.byteLength;
      if (size > 1_048_576)
        throw new PreflightInputError(
          "launcher-output-bounded",
          "PREFLIGHT_NO_GO",
        );
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
}
