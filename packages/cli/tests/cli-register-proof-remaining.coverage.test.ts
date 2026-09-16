// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { registerProofCommand } from "../src/cli-register-proof.js";
import * as inspectMod from "../src/proof/inspect.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("cli-register-proof remaining runner listing", () => {
  test("prints each detected runner in human inspect output", async () => {
    restores.push(isolateKibiEnv());
    const inspectSpy = spyOn(
      inspectMod,
      "inspectProofEnvironment",
    ).mockReturnValue({
      languages: ["typescript"],
      buildSystems: ["bun"],
      detectedRunners: ["playwright", "vitest"],
      ciWorkflows: [],
      currentIntegration: null,
      recommendation: "none",
      missing: [],
    });
    spies.push(inspectSpy);
    const chunks: string[] = [];
    const writeSpy = spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    spies.push(writeSpy);
    const program = new Command();
    program.exitOverride();
    registerProofCommand(program);
    await program.parseAsync(["proof", "inspect"], { from: "user" });
    const text = chunks.join("");
    expect(text).toContain("  ✓ playwright");
    expect(text).toContain("  ✓ vitest");
  });
});
