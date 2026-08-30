import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { KibiPlaywrightProducer } from "../../src/proof/producers/playwright-reporter.js";
import {
  PROOF_RUN_VERSION,
  proofRunArtifactErrors,
} from "../../src/public/proof-protocol.js";

describe("Kibi Playwright producer", () => {
  test("writes a kibi.proof-run.v1 artifact with complete attempt history", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-producer-"));
    const output = path.join(root, "run.json");
    const now = (() => {
      let index = 0;
      return () => new Date(`2026-08-13T00:00:0${index++}.000Z`);
    })();
    const producer = new KibiPlaywrightProducer({
      outputPath: output,
      codeSnapshot: "a".repeat(64),
      commandArgv: ["npx", "playwright", "test"],
      integration: "web-e2e",
      now,
    });
    producer.onBegin();
    producer.onTestEnd(
      {
        titlePath: () => ["checkout", "accepts a card"],
        location: { file: "tests/checkout.spec.ts", line: 4 },
        project: () => ({ name: "chromium" }),
      },
      { status: "failed", duration: 10 },
    );
    producer.onTestEnd(
      {
        titlePath: () => ["checkout", "accepts a card"],
        location: { file: "tests/checkout.spec.ts", line: 4 },
        project: () => ({ name: "chromium" }),
      },
      { status: "passed", duration: 12 },
    );
    await producer.onEnd({ status: "passed" });
    const artifact = JSON.parse(await readFile(output, "utf8")) as Record<
      string,
      unknown
    >;
    expect(artifact.version).toBe(PROOF_RUN_VERSION);
    expect(artifact.command_argv).toEqual(["npx", "playwright", "test"]);
    expect(artifact.integration).toBe("web-e2e");
    const results = artifact.proof_results as Record<string, unknown>[];
    expect(results).toHaveLength(1);
    expect(results[0]?.target).toBe("chromium");
    expect(results[0]?.binding).toBe("native_case");
    expect(results[0]?.attempts).toEqual({
      status: "complete",
      entries: [
        { outcome: "failed", duration_ms: 10 },
        { outcome: "passed", duration_ms: 12 },
      ],
    });
    expect(proofRunArtifactErrors(artifact)).toEqual([]);
  });

  test("reports a failed run without pretending success", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-producer-"));
    const output = path.join(root, "run.json");
    const producer = new KibiPlaywrightProducer({
      outputPath: output,
      codeSnapshot: "a".repeat(64),
      commandArgv: ["npx", "playwright", "test"],
      now: () => new Date("2026-08-13T00:00:00.000Z"),
    });
    producer.onBegin();
    producer.onTestEnd(
      {
        titlePath: () => ["checkout", "accepts a card"],
        location: { file: "tests/checkout.spec.ts", line: 4 },
      },
      { status: "timedOut", duration: 30000 },
    );
    await producer.onEnd({ status: "failed" });
    const artifact = JSON.parse(await readFile(output, "utf8")) as Record<
      string,
      unknown
    >;
    const run = artifact.run as Record<string, unknown>;
    expect(run.outcome).toBe("failed");
    expect(proofRunArtifactErrors(artifact)).toEqual([]);
  });
});
