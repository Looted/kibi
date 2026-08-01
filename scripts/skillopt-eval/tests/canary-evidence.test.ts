import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sha256File,
  verifyCapabilityEvidence,
} from "../runtime/canary-evidence";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("Codex capability evidence", () => {
  test("accepts the exact broker-added bash wrapper around the probe", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-test-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: probe.expectedOutput,
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    // When
    const attempt = verifyCapabilityEvidence(events, probe);

    // Then
    expect(await attempt).toBeUndefined();
  });

  test("accepts exit-zero probe evidence when Codex drops aggregated_output", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-empty-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: "",
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    await expect(verifyCapabilityEvidence(events, probe)).resolves.toBeUndefined();
  });

  test("rejects non-empty mismatched probe output even when exit code is zero", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-mismatch-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: "not-the-pass-token\n",
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    await expect(verifyCapabilityEvidence(events, probe)).rejects.toMatchObject({
      name: "CanaryEvidenceError",
      message: "missing_probe_execution",
    });
  });
});
