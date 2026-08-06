import { createHash } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import { fsyncDirectory, readSecureFile } from "./adoption-durable";

async function lstatSecure(path: string) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) throw new Error("adoption symlink");
  return metadata;
}

// implements REQ-skillopt-automatic-adoption
export type DurableOperation =
  | "intent-write"
  | "intent-fsync"
  | "link"
  | "stage-unlink"
  | "intent-unlink";

// implements REQ-skillopt-automatic-adoption
export type DurableFault = (operation: DurableOperation) => Promise<void>;

type NoReplaceIntent = Readonly<{
  path: string;
  stage: string;
  dev: string;
  ino: string;
  hash: string;
}>;

// implements REQ-skillopt-automatic-adoption
export function intentPath(path: string): string {
  return `${path}.install-intent.json`;
}

function hash(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// implements REQ-skillopt-automatic-adoption
export async function fault(
  injection: DurableFault | undefined,
  operation: DurableOperation,
): Promise<void> {
  await injection?.(operation);
}

// implements REQ-skillopt-automatic-adoption
export async function writeIntent(
  path: string,
  stage: string,
  bytes: Buffer | string,
  injection: DurableFault | undefined,
): Promise<void> {
  const metadata = await lstatSecure(stage);
  const intent: NoReplaceIntent = {
    path,
    stage,
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    hash: hash(bytes),
  };
  const target = intentPath(path);
  await writeFile(target, `${JSON.stringify(intent)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  await fault(injection, "intent-write");
  const handle = await open(target, 0);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fault(injection, "intent-fsync");
  await fsyncDirectory(dirname(path));
}

// implements REQ-skillopt-automatic-adoption
export async function readIntent(
  path: string,
): Promise<NoReplaceIntent | undefined> {
  try {
    const parsed: unknown = JSON.parse(
      await readFile(intentPath(path), "utf8"),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("path" in parsed) ||
      !("stage" in parsed) ||
      !("dev" in parsed) ||
      !("ino" in parsed) ||
      !("hash" in parsed) ||
      typeof parsed.path !== "string" ||
      typeof parsed.stage !== "string" ||
      typeof parsed.dev !== "string" ||
      typeof parsed.ino !== "string" ||
      typeof parsed.hash !== "string"
    ) {
      throw new Error("adoption no-replace intent malformed");
    }
    return {
      path: parsed.path as string,
      stage: parsed.stage as string,
      dev: parsed.dev as string,
      ino: parsed.ino as string,
      hash: parsed.hash as string,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return undefined;
    throw error;
  }
}

// implements REQ-skillopt-automatic-adoption
export async function finalizeIntent(
  repoRoot: string,
  path: string,
  intent: NoReplaceIntent,
  injection: DurableFault | undefined,
): Promise<void> {
  if (intent.path !== path)
    throw new Error("adoption no-replace intent path drift");
  const stage = await lstatSecure(intent.stage);
  const destination = await lstatSecure(path);
  if (
    stage.isSymbolicLink() ||
    destination.isSymbolicLink() ||
    !stage.isFile() ||
    !destination.isFile() ||
    stage.dev !== destination.dev ||
    stage.ino !== destination.ino ||
    String(stage.dev) !== intent.dev ||
    String(stage.ino) !== intent.ino ||
    stage.nlink !== 2 ||
    destination.nlink !== 2 ||
    hash(await readFile(path)) !== intent.hash
  ) {
    throw new Error("adoption no-replace intent drift");
  }
  await rm(intent.stage);
  await fault(injection, "stage-unlink");
  await fsyncDirectory(dirname(path));
  await rm(intentPath(path));
  await fault(injection, "intent-unlink");
  await fsyncDirectory(dirname(path));
  await readSecureFile(repoRoot, path);
}

// implements REQ-skillopt-automatic-adoption
export async function recoverNoReplaceIntents(
  repoRoot: string,
  root = repoRoot,
): Promise<void> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = `${root}/${entry.name}`;
    if (entry.isDirectory()) {
      await recoverNoReplaceIntents(repoRoot, candidate);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".install-intent.json"))
      continue;
    const target = candidate.slice(0, -".install-intent.json".length);
    const intent = await readIntent(target);
    if (intent !== undefined)
      await finalizeIntent(repoRoot, target, intent, undefined);
  }
}
