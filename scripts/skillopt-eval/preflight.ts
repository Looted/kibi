import { mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import type { PreflightReceipt } from "./preflight-contracts";
import { PreflightNoGo, qualifySkillOptHost } from "./preflight-host";

export {
  runCapabilityCanary,
  runPreflight,
  sourceWorktreeIsClean,
} from "./legacy-preflight";
export type {
  CapabilityCanaryReceipt,
  PreflightConfig,
  PreflightDependencies,
  PreflightReceipt,
} from "./legacy-preflight";
export { PreflightNoGo, qualifySkillOptHost } from "./preflight-host";
export type { HostPreflightOptions } from "./preflight-host";
export type { PreflightReceipt as HostPreflightReceipt } from "./preflight-contracts";

const CliSchema = z
  .object({
    sandboxLock: z.string().min(1),
    providerLock: z.string().min(1),
    verifierLock: z.string().min(1),
    artifactRoot: z.string().min(1),
    output: z.string().min(1),
    fixtureRoot: z.string().min(1).optional(),
  })
  .strict();

type CliOptions = z.infer<typeof CliSchema>;
type ReceiptDestination = Readonly<{
  artifactRoot: string;
  output: string;
  signal?: AbortSignal;
  delayMs?: number;
  onTemporaryReady?: () => void;
}>;

class PreflightCliError extends Error {
  readonly name = "PreflightCliError";
  constructor(readonly check: string) {
    super(check);
  }
}

class PreflightInterruptedError extends Error {
  readonly name = "PreflightInterruptedError";
}

function parseCli(argv: readonly string[]): CliOptions {
  const values: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith("--")) {
      throw new PreflightCliError("cli-arguments");
    }
    if (value.split(sep).includes(".."))
      throw new PreflightCliError("path-traversal");
    values[flag.slice(2)] = value;
  }
  const fixtureRoot = values["fixture-root"];
  if (
    fixtureRoot !== undefined &&
    process.env.KIBI_SKILLOPT_TEST_FIXTURE !== "1"
  ) {
    throw new PreflightCliError("fixture-root-disabled");
  }
  return CliSchema.parse({
    sandboxLock: values["sandbox-lock"],
    providerLock: values["provider-lock"],
    verifierLock: values["verifier-lock"],
    artifactRoot: values["artifact-root"],
    output: values.output,
    ...(fixtureRoot === undefined ? {} : { fixtureRoot }),
  });
}

async function writeReceipt(
  options: ReceiptDestination,
  receipt: PreflightReceipt,
): Promise<void> {
  const artifactRoot = resolve(options.artifactRoot);
  const output = resolve(options.output);
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  const outputParent = dirname(output);
  await mkdir(outputParent, { recursive: true, mode: 0o700 });
  if ((await realpath(outputParent)) !== outputParent)
    throw new PreflightCliError("output-parent-symlink");
  const temporary = join(
    outputParent,
    `.${basename(output)}.${process.pid}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    if (options.signal?.aborted) throw new PreflightInterruptedError();
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    options.onTemporaryReady?.();
    if ((options.delayMs ?? 0) > 0)
      await delay(options.delayMs, undefined, { signal: options.signal });
    if (options.signal?.aborted) throw new PreflightInterruptedError();
    await rename(temporary, output);
    const directory = await open(outputParent, "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    if (options.signal?.aborted) throw new PreflightInterruptedError();
    throw error;
  } finally {
    await handle?.close();
    await rm(temporary, { force: true });
  }
}

function failureDestination(
  argv: readonly string[],
): ReceiptDestination | undefined {
  let artifactRoot: string | undefined;
  let output: string | undefined;
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--artifact-root") artifactRoot = value;
    if (flag === "--output") output = value;
  }
  if (artifactRoot === undefined || output === undefined) return undefined;
  if (
    artifactRoot.split(sep).includes("..") ||
    output.split(sep).includes("..")
  )
    return undefined;
  return { artifactRoot, output };
}

function cliFailure(check: string): PreflightReceipt {
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-host-preflight",
    status: "no-go",
    code: "LOCK_INVALID",
    reasons: [{ check, expected: "valid preflight CLI contract" }],
    lockDigests: { sandbox: "", provider: "", verifier: "" },
    expected: {
      externalRoot: "/etc/kibi-skillopt",
      launcher: "/usr/libexec/kibi-skillopt-verifier-launch",
      installerCommand:
        "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1",
      paths: [],
      identities: [],
      fdInventory: [],
      digests: {},
      systemdSocketActivation: true,
    },
    checks: [],
    verifierAttestation: { payload: null, signature: "unavailable" },
    paidModelCalls: 0,
    runtimeAuthorized: false,
  };
}

// implements REQ-skillopt-codex-optimization
export async function preflightMain(argv: readonly string[]): Promise<number> {
  let options: CliOptions;
  try {
    options = parseCli(argv);
  } catch (error) {
    const check =
      error instanceof PreflightCliError ? error.check : "cli-schema";
    const failure = cliFailure(check);
    const destination = failureDestination(argv);
    if (destination !== undefined) await writeReceipt(destination, failure);
    process.stderr.write(`${JSON.stringify(failure)}\n`);
    return 2;
  }
  let receipt: PreflightReceipt;
  try {
    receipt = await qualifySkillOptHost({
      sandboxLock: options.sandboxLock,
      providerLock: options.providerLock,
      verifierLock: options.verifierLock,
      ...(options.fixtureRoot === undefined
        ? {}
        : { fixtureRoot: resolve(options.fixtureRoot) }),
    });
  } catch (error) {
    if (!(error instanceof PreflightNoGo)) throw error;
    receipt = error.receipt;
  }
  const controller = new AbortController();
  const interrupt = (): void => controller.abort();
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const configuredDelay =
      options.fixtureRoot === undefined
        ? 0
        : Number.parseInt(
            process.env.KIBI_SKILLOPT_TEST_RECEIPT_DELAY_MS ?? "0",
            10,
          );
    await writeReceipt(
      {
        ...options,
        signal: controller.signal,
        delayMs: Number.isFinite(configuredDelay) ? configuredDelay : 0,
        ...(options.fixtureRoot !== undefined &&
        process.env.KIBI_SKILLOPT_TEST_RECEIPT_READY === "1"
          ? { onTemporaryReady: () => process.stdout.write("TEMP_READY\n") }
          : {}),
      },
      receipt,
    );
  } catch (error) {
    if (error instanceof PreflightInterruptedError) return 143;
    throw error;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  return receipt.status === "qualified" ? 0 : 1;
}

if (import.meta.main)
  process.exitCode = await preflightMain(process.argv.slice(2));
