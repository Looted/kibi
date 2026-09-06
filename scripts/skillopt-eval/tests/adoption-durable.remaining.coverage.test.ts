// implements REQ-skillopt-automatic-adoption
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { constants } from "node:fs";
import * as fsPromises from "node:fs/promises";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  durableNoReplace,
  readSecureFile,
} from "../adoption-durable";
import { intentPath } from "../adoption-intent";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  const { rm } = fsPromises;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("adoption-durable remaining identity, intent, and link failures", () => {
  test("readSecureFile detects inode drift and non-file handles", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-durable-read-"));
    roots.push(repoRoot);
    const path = join(repoRoot, "receipt.json");
    await writeFile(path, "body\n", { mode: 0o600 });
    const originalOpen = fsPromises.open.bind(fsPromises);
    const open = spyOn(fsPromises, "open").mockImplementation(async (target, flags) => {
      const handle = await originalOpen(target, flags);
      if (String(target) === path && flags === (constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))) {
        const originalStat = handle.stat.bind(handle);
        handle.stat = (async () => {
          const stats = await originalStat();
          return { ...stats, isFile: () => false, nlink: 1 };
        }) as typeof handle.stat;
      }
      return handle;
    });
    spies.push(open);
    await expect(readSecureFile(repoRoot, path)).rejects.toThrow(
      /adoption file hardlink/,
    );
    open.mockRestore();

    const drift = spyOn(fsPromises, "open").mockImplementation(
      async (target, flags) => {
        const handle = await originalOpen(target, flags);
        if (
          String(target) === path &&
          flags === (constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
        ) {
          const originalStat = handle.stat.bind(handle);
          handle.stat = (async () => {
            const stats = await originalStat();
            return {
              ...stats,
              isFile: () => true,
              nlink: 1,
              ino:
                typeof stats.ino === "bigint" ? stats.ino + 1n : stats.ino + 1,
            };
          }) as typeof handle.stat;
        }
        return handle;
      },
    );
    spies.push(drift);
    await expect(readSecureFile(repoRoot, path)).rejects.toThrow(
      /adoption file inode drift/,
    );
  });

  test("durableNoReplace cleans up after intent faults, EEXIST drift, and non-EEXIST link errors", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-durable-write-"));
    roots.push(repoRoot);
    const intentFail = join(repoRoot, "intent-fail.json");
    await expect(
      durableNoReplace(repoRoot, intentFail, "one\n", undefined, async (operation) => {
        if (operation === "intent-write") throw new Error("intent boom");
      }),
    ).rejects.toThrow("intent boom");

    const accessPath = join(repoRoot, "access.json");
    const originalLink = fsPromises.link.bind(fsPromises);
    const link = spyOn(fsPromises, "link").mockImplementation(async (from, to) => {
      if (String(to) === accessPath) {
        const error = new Error("EACCES");
        (error as Error & { code: string }).code = "EACCES";
        throw error;
      }
      return originalLink(from, to);
    });
    spies.push(link);
    await expect(durableNoReplace(repoRoot, accessPath, "two\n")).rejects.toThrow(
      "EACCES",
    );
    link.mockRestore();

    const existPath = join(repoRoot, "exist.json");
    await writeFile(existPath, "existing\n", { mode: 0o600 });
    const rewrite = spyOn(fsPromises, "link").mockImplementation(async (from, to) => {
      await writeFile(
        intentPath(String(to)),
        `${JSON.stringify({
          path: String(to),
          stage: `${String(from)}-other`,
          dev: "1",
          ino: "1",
          hash: "a".repeat(64),
        })}\n`,
      );
      const error = new Error("EEXIST");
      (error as Error & { code: string }).code = "EEXIST";
      throw error;
    });
    spies.push(rewrite);
    await expect(durableNoReplace(repoRoot, existPath, "three\n")).rejects.toThrow();
  });
});
