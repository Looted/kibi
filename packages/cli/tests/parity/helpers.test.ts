import { afterEach, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeParityValue } from "./helpers.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

test("parity normalizes physical and aliased workspace paths while retaining store and other semantic differences", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-parity-alias-"));
  roots.push(root);
  const physical = path.join(realpathSync.native(root), "physical");
  const alias = path.join(root, "alias");
  mkdirSync(physical);
  symlinkSync(physical, alias, "dir");
  const outcome = (workspace: string) => ({
    branchAttachment: {
      storePath: path.join(workspace, ".kb/branches/abc123/store"),
    },
    branchStore: { path: path.join(workspace, ".kb/branches/abc123/store") },
    state: "ready",
    count: 3,
  });
  const expected = {
    branchAttachment: { storePath: "<workspace>/.kb/branches/<branch>/store" },
    branchStore: { path: "<workspace>/.kb/branches/<branch>/store" },
    state: "ready",
    count: 3,
  };
  expect(normalizeParityValue(outcome(alias), [alias])).toEqual(expected);
  expect(normalizeParityValue(outcome(physical), [alias])).toEqual(expected);
  expect(
    normalizeParityValue({ ...outcome(physical), state: "stale" }, [alias]),
  ).not.toEqual(expected);
  expect(
    normalizeParityValue(
      {
        branchStore: { path: path.join(physical, ".kb/branches/abc123/other") },
      },
      [alias],
    ),
  ).toEqual({
    branchStore: { path: "<workspace>/.kb/branches/<branch>/other" },
  });
  const unrelated = path.join(root, "outside", "store");
  expect(normalizeParityValue({ path: unrelated }, [alias])).toEqual({
    path: unrelated,
  });
});
