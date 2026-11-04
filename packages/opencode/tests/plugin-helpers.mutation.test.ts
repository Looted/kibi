import { afterEach, describe, expect, test } from "bun:test";
import * as logger from "../src/logger";
import { logCheckpointFailure } from "../src/plugin";

afterEach(() => {
  logger.resetClient();
});

describe("logCheckpointFailure", () => {
  test("logs the message of an error or the value itself", async () => {
    const bodies: unknown[] = [];
    logger.setClient({
      app: {
        log: async ({ body }: { body: unknown }) => {
          bodies.push(body);
        },
      },
    } as never);
    logCheckpointFailure("fp-1")(new Error("boom"));
    logCheckpointFailure("fp-2")("plain");
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "error",
        message: "smart-enforcement.checkpoint-failed",
        event: "smart_enforcement_checkpoint_failed",
        fingerprint: "fp-1",
        error: "boom",
      },
      {
        service: "kibi-opencode",
        level: "error",
        message: "smart-enforcement.checkpoint-failed",
        event: "smart_enforcement_checkpoint_failed",
        fingerprint: "fp-2",
        error: "plain",
      },
    ]);
  });
});
