import { afterEach, test } from "bun:test";
import { strict as assert } from "node:assert";
import { DEFAULTS } from "../src/config";
import * as logger from "../src/logger";
import { createSyncScheduler } from "../src/scheduler";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

afterEach(() => {
  logger.resetClient();
});

test("advisory quality log omits blocking count after filtering blocking diagnostics", async () => {
  const logMessages: string[] = [];
  logger.setClient({
    app: {
      log: async (payload) => {
        if (
          isRecord(payload.body) &&
          typeof payload.body.message === "string"
        ) {
          logMessages.push(payload.body.message);
        }
      },
    },
  });

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 0 },
    },
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        qualityDiagnostics: [
          {
            id: "QD-advisory",
            severity: "warning",
            blocking: false,
            message: "Review linked requirement semantics.",
          },
          {
            id: "QD-blocking",
            severity: "error",
            blocking: true,
            message: "Blocking diagnostic stays out of advisory logs.",
          },
        ],
      }),
    }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  await scheduler.flush();

  const advisoryMessage = logMessages.find((message) =>
    message.startsWith("check.advisory_quality "),
  );
  assert.ok(advisoryMessage);
  const parsed: unknown = JSON.parse(
    advisoryMessage.slice("check.advisory_quality ".length),
  );
  assert.ok(isRecord(parsed));
  assert.equal(parsed.count, 1);
  assert.equal(parsed.warning, 1);
  assert.equal(parsed.blocking, undefined);
  assert.equal(parsed.firstId, "QD-advisory");
});
