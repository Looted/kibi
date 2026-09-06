import { afterEach, describe, expect, test } from "bun:test";
import { ProcessControlError, runBoundedProcess } from "../runtime/process";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("bounded process remaining inherited termination", () => {
  test("kills an inherited-group child on timeout", async () => {
    const error = await runBoundedProcess({
      argv: ["bash", "-c", "trap '' TERM; sleep 30"],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 200,
      killGraceMs: 50,
      groupMode: "inherited",
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProcessControlError);
    if (!(error instanceof ProcessControlError)) throw error;
    expect(error.kind).toBe("timeout");
  });
});
