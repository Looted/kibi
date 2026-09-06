// implements REQ-KIBI-BOOTSTRAP-PLAN
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { OperationError } from "../../src/cli-errors.js";
import { discoverBootstrap } from "../../src/operations/bootstrap/discovery.js";
import * as activation from "../../src/operations/bootstrap/activation.js";
import * as discoveryEvidence from "../../src/operations/bootstrap/discovery-evidence.js";
import { scanEvidence } from "../../src/operations/bootstrap/discovery-evidence.js";
import * as kbManifest from "../../src/utils/kb-manifest.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("bootstrap discovery remaining warning and port guards", () => {
  test("scanEvidence requires glob and git ignore ports", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      scanEvidence({
        workspaceRoot: "/tmp/kibi-bootstrap-missing-ports",
        signal: new AbortController().signal,
        clock: () => new Date(),
      } as never),
    ).rejects.toBeInstanceOf(OperationError);
  });

  test("discoverBootstrap swallows manifest-status failures and skips non-string frameworks", async () => {
    restores.push(isolateKibiEnv());
    const status = spyOn(kbManifest, "readKbManifestStatus").mockImplementation(
      () => {
        throw new Error("manifest unreadable");
      },
    );
    spies.push(status);
    const classify = spyOn(activation, "classifyActivation").mockResolvedValue({
      activationState: "root_uninitialized",
      activationMode: "cold_start_bootstrap",
      applyBlocked: true,
      allowCandidateGeneration: true,
      reason: "not initialized",
    } as never);
    spies.push(classify);
    const scan = spyOn(discoveryEvidence, "scanEvidence").mockResolvedValue({
      files: ["src/app.ts"],
      ignoredSources: [],
      warnings: [],
      evidence: [
        {
          provider: "test_topology",
          kind: "test_topology",
          label: "package.json",
          data: { frameworks: [1, "jest"] },
        },
      ],
    } as never);
    spies.push(scan);
    const result = await discoverBootstrap({
      workspaceRoot: "/tmp/kibi-bootstrap-warning",
      signal: new AbortController().signal,
      clock: () => new Date(),
      fs: {
        glob: async () => ["src/app.ts"],
        stat: async () => {
          throw new Error("missing");
        },
      },
      git: {
        ignoredPaths: async () => [],
      },
    } as never);
    expect(result.migrationWarning).toBeNull();
    expect(result.summary.detectedTestFrameworks).toEqual(["jest"]);
  });
});
