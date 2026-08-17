import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeGit } from "../../src/public/operations/node-ports.js";

describe("node workspace snapshot", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("hashes current versionable code while excluding proof-document churn", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-workspace-snapshot-"),
    );
    tempDirs.push(workspaceRoot);
    execFileSync("git", ["init", "-b", "main"], {
      cwd: workspaceRoot,
      stdio: "ignore",
    });
    mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, "kibi-docs"), { recursive: true });
    writeFileSync(path.join(workspaceRoot, "src", "feature.ts"), "v1\n");
    writeFileSync(
      path.join(workspaceRoot, "kibi-docs", "receipt.md"),
      `---
id: TEST-RECEIPT
title: Receipt test
verification_receipts:
  - receipt_id: VR-ONE
verification_contract:
  version: kibi.verification-contract.v1
  runner: pnpm
  command_argv: [pnpm, run, e2e]
  required_case_symbols: [SYM-CASE]
  required_projects: [chromium]
  success_policy: all_required_cases_first_attempt
---
Body
`,
    );
    execFileSync("git", ["add", "src/feature.ts", "kibi-docs/receipt.md"], {
      cwd: workspaceRoot,
    });

    const initial = await nodeGit.workspaceSnapshot?.(workspaceRoot);
    writeFileSync(
      path.join(workspaceRoot, "kibi-docs", "receipt.md"),
      `---
id: TEST-RECEIPT
title: Receipt test
verification_receipts:
  - receipt_id: VR-TWO
verification_contract:
  version: kibi.verification-contract.v1
  runner: pnpm
  command_argv: [pnpm, run, e2e]
  required_case_symbols: [SYM-CASE]
  required_projects: [chromium]
  success_policy: all_required_cases_first_attempt
---
Body
`,
    );
    const documentationOnly = await nodeGit.workspaceSnapshot?.(workspaceRoot);
    writeFileSync(path.join(workspaceRoot, "src", "feature.ts"), "v2\n");
    const codeChanged = await nodeGit.workspaceSnapshot?.(workspaceRoot);

    expect(initial).toMatchObject({
      version: "kibi.workspace-snapshot.v2",
      dirty: true,
      fileCount: 2,
    });
    expect(initial?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(documentationOnly?.hash).toBe(initial?.hash);
    expect(codeChanged?.hash).not.toBe(initial?.hash);

    writeFileSync(
      path.join(workspaceRoot, "kibi-docs", "receipt.md"),
      `---
id: TEST-RECEIPT
title: Changed test contract
verification_receipts:
  - receipt_id: VR-TWO
verification_contract:
  version: kibi.verification-contract.v1
  runner: pnpm
  command_argv: [pnpm, run, e2e, --, e2e/changed.spec.ts]
  required_case_symbols: [SYM-CASE]
  required_projects: [chromium]
  success_policy: all_required_cases_first_attempt
---
Body
`,
    );
    const testContractChanged =
      await nodeGit.workspaceSnapshot?.(workspaceRoot);
    expect(testContractChanged?.hash).not.toBe(codeChanged?.hash);
  });

  test("reports operational artifacts without marking the verification snapshot dirty", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-workspace-snapshot-dirty-"),
    );
    tempDirs.push(workspaceRoot);
    execFileSync("git", ["init", "-b", "main"], {
      cwd: workspaceRoot,
      stdio: "ignore",
    });
    execFileSync("git", ["config", "user.email", "kibi@example.test"], {
      cwd: workspaceRoot,
    });
    execFileSync("git", ["config", "user.name", "Kibi Test"], {
      cwd: workspaceRoot,
    });
    mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, ".kb", "migrations"), {
      recursive: true,
    });
    writeFileSync(path.join(workspaceRoot, "src", "feature.ts"), "v1\n");
    writeFileSync(
      path.join(workspaceRoot, ".kb", "migrations", "recovery.json"),
      '{"state":"initial"}\n',
    );
    execFileSync(
      "git",
      ["add", "-f", "src/feature.ts", ".kb/migrations/recovery.json"],
      {
        cwd: workspaceRoot,
      },
    );
    execFileSync("git", ["commit", "--quiet", "-m", "initial"], {
      cwd: workspaceRoot,
    });

    const clean = await nodeGit.workspaceSnapshot?.(workspaceRoot);
    writeFileSync(
      path.join(workspaceRoot, ".kb", "migrations", "recovery.json"),
      '{"state":"operator-recovery"}\n',
    );
    const operationalOnly = await nodeGit.workspaceSnapshot?.(workspaceRoot);
    writeFileSync(path.join(workspaceRoot, "src", "feature.ts"), "v2\n");
    const sourceChanged = await nodeGit.workspaceSnapshot?.(workspaceRoot);

    expect(clean).toMatchObject({ dirty: false, changeCount: 0, changes: [] });
    expect(operationalOnly).toMatchObject({
      dirty: false,
      changeCount: 1,
      changes: [
        {
          path: ".kb/migrations/recovery.json",
          status: " M",
          snapshotRelevant: false,
        },
      ],
    });
    expect(operationalOnly?.hash).toBe(clean?.hash);
    expect(sourceChanged).toMatchObject({
      dirty: true,
      changeCount: 2,
      changes: expect.arrayContaining([
        expect.objectContaining({
          path: "src/feature.ts",
          snapshotRelevant: true,
        }),
        expect.objectContaining({
          path: ".kb/migrations/recovery.json",
          snapshotRelevant: false,
        }),
      ]),
    });
    expect(sourceChanged?.hash).not.toBe(clean?.hash);
  });
});
