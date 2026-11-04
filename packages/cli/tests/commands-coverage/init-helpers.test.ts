import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  copySchemaFiles,
  installGitHooks,
  installHook,
} from "../../src/commands/init-helpers.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function dir(): string {
  const root = createTempDir("kibi-init-helpers-");
  roots.push(root);
  return root;
}

function quietConsole(): { logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.join(" "));
  });
  return { logs, errors };
}

describe("copySchemaFiles", () => {
  test("refuses a schema destination that is not a regular file", async () => {
    const root = dir();
    const source = path.join(root, "source");
    mkdirSync(source);
    writeFileSync(path.join(source, "kb.pl"), "% schema\n");
    const kbDir = path.join(root, ".kb");
    mkdirSync(path.join(kbDir, "schema", "kb.pl"), { recursive: true });
    await expect(copySchemaFiles(kbDir, source)).rejects.toThrow(
      `Refusing non-file or symlink schema destination: ${path.join(kbDir, "schema", "kb.pl")}`,
    );
  });

  test("rethrows copy errors other than an existing destination", async () => {
    const root = dir();
    const source = path.join(root, "source");
    mkdirSync(source);
    writeFileSync(path.join(source, "kb.pl"), "% schema\n");
    await expect(
      copySchemaFiles(path.join(root, "missing-kb"), source),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("installHook failure handling", () => {
  test("leaves a hook untouched when it cannot be inspected", () => {
    const io = quietConsole();
    const hookPath = path.join(dir(), "x".repeat(300));
    expect(installHook(hookPath, "body")).toBe("skipped-unsupported");
    expect(io.errors).toHaveLength(1);
    expect(io.errors[0]).toStartWith(`! Unable to inspect ${hookPath}: `);
    expect(io.errors[0]).toEndWith("; leaving it untouched.");
  });

  test("leaves a hook untouched when it cannot be read", () => {
    const io = quietConsole();
    const hookPath = path.join(dir(), "pre-commit");
    writeFileSync(hookPath, "");
    spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("read denied");
    });
    expect(installHook(hookPath, "body")).toBe("skipped-unsupported");
    expect(io.errors).toStrictEqual([
      `! Unable to read ${hookPath}: read denied; leaving it untouched.`,
    ]);
  });
});

describe("installGitHooks reporting", () => {
  test("explains foreign hooks and a configured core.hooksPath", () => {
    const io = quietConsole();
    const hooksDir = path.join(dir(), "hooks");
    mkdirSync(hooksDir);
    for (const hook of [
      "post-checkout",
      "post-merge",
      "post-rewrite",
      "pre-commit",
    ]) {
      writeFileSync(path.join(hooksDir, hook), "#!/bin/sh\necho mine\n");
    }
    const results = installGitHooks(hooksDir, {
      hooksPathOrigin: "local config",
    });
    expect(results.every((entry) => entry.result === "skipped-foreign")).toBe(
      true,
    );
    expect(io.logs).toContain(
      "! post-merge: existing non-Kibi hook left untouched; Kibi enforcement is NOT installed for this hook. To integrate: delegate from that hook to 'kibi sync'; print a copy-paste snippet that resolves a project-local kibi with 'kibi init --print-hook post-merge'.",
    );
    expect(io.logs.at(-1)).toStartWith(
      `! core.hooksPath is configured (local config); the effective hooks directory for THIS checkout is ${hooksDir}.`,
    );
  });
});
