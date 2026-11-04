import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalFilesystemPath } from "../../src/utils/canonical-path.js";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-canon-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("canonicalFilesystemPath", () => {
  test("returns the real path of an existing entry", () => {
    const dir = path.join(root, "real");
    mkdirSync(dir);
    const link = path.join(root, "alias");
    symlinkSync(dir, link);
    expect(canonicalFilesystemPath(link)).toBe(dir);
    expect(canonicalFilesystemPath(dir)).toBe(dir);
  });

  test("resolves relative input against the working directory", () => {
    const rel = path.relative(process.cwd(), path.join(root, "real"));
    expect(canonicalFilesystemPath(rel)).toBe(path.join(root, "real"));
  });

  test("keeps a missing suffix of several segments in order", () => {
    const link = path.join(root, "alias2");
    symlinkSync(path.join(root, "real"), link);
    expect(canonicalFilesystemPath(path.join(link, "a", "b", "c.txt"))).toBe(
      path.join(root, "real", "a", "b", "c.txt"),
    );
  });

  test("refuses a dangling symlink with the original ENOENT error", () => {
    const dangling = path.join(root, "dangling");
    symlinkSync(path.join(root, "nowhere"), dangling);
    let caught: NodeJS.ErrnoException | undefined;
    try {
      canonicalFilesystemPath(path.join(dangling, "child"));
    } catch (error) {
      caught = error as NodeJS.ErrnoException;
    }
    expect(caught?.code).toBe("ENOENT");
    expect(caught?.path).toBe(dangling);
  });

  test("rethrows errors other than ENOENT from realpath", () => {
    const file = path.join(root, "file.txt");
    writeFileSync(file, "x");
    let caught: NodeJS.ErrnoException | undefined;
    try {
      canonicalFilesystemPath(path.join(file, "child"));
    } catch (error) {
      caught = error as NodeJS.ErrnoException;
    }
    expect(caught?.code).toBe("ENOTDIR");
  });

  test("rethrows errors other than ENOENT from lstat", () => {
    const loopA = path.join(root, "loopA");
    const loopB = path.join(root, "loopB");
    symlinkSync(loopB, loopA);
    symlinkSync(loopA, loopB);
    let caught: NodeJS.ErrnoException | undefined;
    try {
      canonicalFilesystemPath(path.join(loopA, "x", "y"));
    } catch (error) {
      caught = error as NodeJS.ErrnoException;
    }
    expect(caught?.code).toBe("ELOOP");
  });
});
