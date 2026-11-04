import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as impact from "../../../src/public/impact-diagnostics.js";
import {
  executeCheck,
  uncompiledBranchStoreViolation,
} from "../../../src/public/operations/check-executor.js";
import * as discovery from "../../../src/public/operations/discovery-executors.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import * as reporting from "../../../src/public/operations/specs/reporting.js";
import { branchStorePath } from "../../../src/utils/branch-store-locator.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

function context(overrides: Partial<OperationContext> = {}): OperationContext {
  const prolog: PrologPort = {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog,
    ...overrides,
  };
}

function workspace(): string {
  const root = createTempDir("kibi-check-uncompiled-");
  roots.push(root);
  mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "requirements", "REQ-1.md"),
    "---\nid: REQ-1\ntitle: One\n---\n",
  );
  return root;
}

describe("uncompiledBranchStoreViolation", () => {
  test("a branch that cannot be resolved reports nothing", () => {
    restores.push(isolateKibiEnv());
    process.env.KIBI_BRANCH = "main";
    const root = workspace();
    // A file where the migration journal folder belongs makes resolution throw.
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "recovery", "branch-migrations"), "");
    expect(uncompiledBranchStoreViolation(context(), root)).toBeNull();
  });
});

describe("executeCheck on an uncompiled branch store", () => {
  test("reports only the uncompiled store", async () => {
    restores.push(isolateKibiEnv());
    const root = workspace();
    const status = spyOn(discovery, "executeStatus").mockRejectedValue(
      new Error("Failed to resolve active branch: detached"),
    );
    spies.push(status);
    const result = await executeCheck(
      {},
      context({
        workspaceRoot: root,
        branchAttachment: {
          gitBranch: "main",
          kbBranch: "main",
          storePath: branchStorePath(root, "main"),
          kind: "exact",
          migrationRequired: false,
        },
      }),
    );
    const structured = result.structuredContent as unknown as {
      violations: { rule: string; entityId: string }[];
      diagnostics: { category: string; file?: string; suggestion?: string }[];
    };
    expect(
      structured.violations.map((violation) => [
        violation.rule,
        violation.entityId,
      ]),
    ).toStrictEqual([["branch-store-not-compiled", "main"]]);
    expect(structured.diagnostics[0]?.category).toBe("SYNC_ERROR");
    expect(structured.diagnostics[0]?.file).toBe(branchStorePath(root, "main"));
    expect(structured.diagnostics[0]?.suggestion).toStartWith("Run kibi sync");
  });
});

describe("executeCheck proof test bindings", () => {
  test("full quality diagnostics read the per-contract bindings lazily", async () => {
    restores.push(isolateKibiEnv());
    const bindings = spyOn(
      reporting,
      "perContractTestBindings",
    ).mockResolvedValue("bindings");
    spies.push(bindings);
    let seen: string | null | undefined;
    const collect = spyOn(
      impact,
      "collectFullKbQualityDiagnostics",
    ).mockImplementation(async (options) => {
      seen = await options.proofTestBindings?.();
      return [];
    });
    spies.push(collect);
    const status = spyOn(discovery, "executeStatus").mockRejectedValue(
      new Error("Failed to resolve active branch: detached"),
    );
    spies.push(status);
    await executeCheck({ rules: [] }, context(), {
      collectFullQualityDiagnosticsForExplicitRules: true,
    });
    expect(seen).toBe("bindings");
    expect(bindings).toHaveBeenCalledTimes(1);
  });
});
