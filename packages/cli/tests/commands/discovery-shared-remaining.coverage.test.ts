// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  executeReportingSpec,
  withAttachedBranchProlog,
} from "../../src/commands/discovery-shared.js";
import { EngineClient } from "../../src/engine.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import * as runtimeTypes from "../../src/public/operations/runtime-types.js";
import * as resolver from "../../src/utils/branch-resolver.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
  process.exitCode = 0;
});

describe("discovery-shared remaining runtime branches", () => {
  test("executeReportingSpec forwards the CLI runtime into executeOperation", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const execute = spyOn(runtimeTypes, "executeOperation").mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      structuredContent: { rows: [] },
    } as never);
    restores.push(() => execute.mockRestore());

    const result = await executeReportingSpec(
      coverageSpec,
      { by: "req" },
      { workspaceRoot: process.cwd() },
    );

    expect(result.structuredContent as unknown).toEqual({ rows: [] });
    expect(execute.mock.calls).toHaveLength(1);
    expect(execute.mock.calls[0]?.[1]).toBe(coverageSpec);
    expect(execute.mock.calls[0]?.[2]).toEqual({ by: "req" });
  });

  test("withAttachedBranchProlog uses EngineClient when no createProlog dep is supplied", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const attachment = spyOn(resolver, "resolveBranchAttachment").mockReturnValue(
      {
        gitBranch: "main",
        kbBranch: "main",
        storePath: `${cwd}/.kb/branches/main`,
        kind: "exact",
        migrationRequired: false,
      },
    );
    const start = spyOn(EngineClient.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      attachment.mockRestore();
      start.mockRestore();
      terminate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      withAttachedBranchProlog(async (prolog) => {
        expect(prolog).toBeInstanceOf(EngineClient);
        return "engine-path";
      }),
    );

    expect(result).toBe("engine-path");
    expect(start).toHaveBeenCalled();
    expect(terminate).toHaveBeenCalled();
  });
});
