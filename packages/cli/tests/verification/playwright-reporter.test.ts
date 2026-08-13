import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { KibiPlaywrightReporter } from "../../src/verification/playwright-reporter.js";

describe("Kibi Playwright reporter", () => {
  test("writes a raw versioned artifact without importing Playwright", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-reporter-"));
    const output = path.join(root, "run.json");
    const now = (() => {
      let index = 0;
      return () => new Date(`2026-08-13T00:00:0${index++}.000Z`);
    })();
    const reporter = new KibiPlaywrightReporter({
      outputPath: output,
      codeSnapshot: "a".repeat(64),
      commandArgv: ["pnpm", "exec", "playwright", "test"],
      now,
    });
    reporter.onBegin();
    reporter.onTestEnd(
      {
        titlePath: () => ["checkout", "accepts a card"],
        location: { file: "tests/checkout.spec.ts", line: 4 },
        project: () => ({ name: "chromium" }),
      },
      { status: "passed", retry: 0, duration: 12 },
    );
    await reporter.onEnd({ status: "passed" });
    const artifact = JSON.parse(await readFile(output, "utf8")) as Record<
      string,
      unknown
    >;
    expect(artifact.version).toBe("kibi.playwright-run.v1");
    expect(artifact.command_argv).toEqual([
      "pnpm",
      "exec",
      "playwright",
      "test",
    ]);
    expect(artifact.cases).toEqual([
      expect.objectContaining({
        project: "chromium",
        outcome: "passed",
        retries: 0,
        duration_ms: 12,
      }),
    ]);
  });
});
