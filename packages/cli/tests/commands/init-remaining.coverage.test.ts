// implements REQ-cli-init
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { initCommand } from "../../src/commands/init.js";
import * as activation from "../../src/operations/bootstrap/activation.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("init remaining next-action and non-git error copy", () => {
  test("prints the raw attachment error when git is present but unusable", async () => {
    restores.push(isolateKibiEnv());
    const spy = spyOn(branchResolver, "resolveBranchAttachment").mockReturnValue({
      error: "Detached HEAD blocks init.",
      code: "DETACHED_HEAD",
    } as never);
    spies.push(spy);
    const io = captureIo();
    restores.push(io.restore);
    const result = await initCommand({});
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Detached HEAD blocks init.");
  });

  test("points a seeded workspace at continue-kibi-workflow", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
    const classify = spyOn(activation, "classifyActivation").mockResolvedValue({
      activationState: "root_active_seeded",
      activationMode: "attached_seeded_handoff",
      applyBlocked: true,
      allowCandidateGeneration: false,
      reason: "seeded",
      handoffMessage: "use existing KB",
    } as never);
    spies.push(classify);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(root, () => initCommand({}));
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(/already has seeded Kibi knowledge/);
  });
});
