// implements REQ-skillopt-automatic-adoption
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertFileIdentity,
  assertSecureDirectory,
  durableNoReplace,
  durableReplace,
  ensureSecureDirectory,
  fsyncDirectory,
  readDurableText,
  readSecureFile,
} from "../skillopt-eval/adoption-durable.ts";
import {
  fault,
  intentPath,
  readIntent,
  recoverNoReplaceIntents,
  writeIntent,
} from "../skillopt-eval/adoption-intent.ts";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function privateRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-adoption-"));
  chmodSync(root, 0o700);
  roots.push(root);
  return root;
}

describe("skillopt adoption durable helpers", () => {
  test("intent helpers write, read, reject malformed intents, and recover empty trees", async () => {
    const root = privateRoot();
    const target = path.join(root, "artifact.txt");
    writeFileSync(target, "payload\n");
    expect(intentPath(target)).toBe(`${target}.install-intent.json`);
    await fault(undefined, "intent-write");
    const calls: string[] = [];
    await fault(async (operation) => {
      calls.push(operation);
    }, "intent-fsync");
    expect(calls).toEqual(["intent-fsync"]);

    expect(await readIntent(target)).toBeUndefined();
    await writeIntent(target, target, "payload\n", undefined);
    const intent = await readIntent(target);
    expect(intent?.hash).toHaveLength(64);
    expect(intent?.path).toBe(target);

    writeFileSync(intentPath(target), "[1]\n");
    await expect(readIntent(target)).rejects.toThrow(/malformed/);

    const nested = path.join(root, "empty", "child");
    mkdirSync(nested, { recursive: true });
    chmodSync(path.join(root, "empty"), 0o700);
    chmodSync(nested, 0o700);
    await recoverNoReplaceIntents(root, path.join(root, "empty"));
  });

  test("secure directory and file helpers reject escapes, symlinks, and group-writable dirs", async () => {
    const root = privateRoot();
    await assertSecureDirectory(root);
    await ensureSecureDirectory(path.join(root, "private"));
    await expect(assertSecureDirectory(path.join(root, "missing"))).rejects.toThrow();
    writeFileSync(path.join(root, "not-dir"), "x\n");
    await expect(assertSecureDirectory(path.join(root, "not-dir"))).rejects.toThrow(
      /not a directory/,
    );
    const link = path.join(root, "dir-link");
    symlinkSync(root, link);
    await expect(assertSecureDirectory(link)).rejects.toThrow(/symlink/);

    const openDir = path.join(root, "open");
    mkdirSync(openDir);
    chmodSync(openDir, 0o777);
    await expect(ensureSecureDirectory(openDir)).rejects.toThrow(/not private/);

    const file = path.join(root, "file.txt");
    writeFileSync(file, "hello\n");
    const read = await readSecureFile(root, file);
    expect(read.bytes.toString("utf8")).toBe("hello\n");
    await assertFileIdentity(root, file, read.identity);
    await expect(
      assertFileIdentity(root, file, { dev: 0, ino: 0 }),
    ).rejects.toThrow(/inode drift/);
    expect(await readDurableText(root, file)).toBe("hello\n");
    await fsyncDirectory(root);

    await expect(
      readSecureFile(root, path.join(os.tmpdir(), "outside.txt")),
    ).rejects.toThrow(/escapes repository root/);
  });

  test("durable replace and no-replace write private files", async () => {
    const root = privateRoot();
    const replaced = path.join(root, "replaced.txt");
    writeFileSync(replaced, "old\n");
    const before = await readSecureFile(root, replaced);
    await durableReplace(root, replaced, "new\n", before.identity, async () => undefined);
    expect(await readDurableText(root, replaced)).toBe("new\n");

    const created = path.join(root, "created.txt");
    expect(await durableNoReplace(root, created, "first\n", async () => undefined)).toBe(
      true,
    );
    expect(await readDurableText(root, created)).toBe("first\n");
    expect(await durableNoReplace(root, created, "second\n", undefined)).toBe(false);
    expect(await readDurableText(root, created)).toBe("first\n");
  });

  test("recovers a no-replace intent after a crash on link", async () => {
    const root = privateRoot();
    const target = path.join(root, "receipt.txt");
    await expect(
      durableNoReplace(root, target, "receipt\n", undefined, async (operation) => {
        if (operation === "link") throw new Error("crash:link");
      }),
    ).rejects.toThrow("crash:link");
    await recoverNoReplaceIntents(root);
    expect(await readDurableText(root, target)).toBe("receipt\n");
  });
});
