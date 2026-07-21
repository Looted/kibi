import { describe, expect, test } from "bun:test";
import { type PrototypeScenario, runPrototype } from "../prototype";

const successScenario: PrototypeScenario = {
  id: "prototype-success",
  finalState: "expected",
  mcpCalls: ["kb_search", "kb_query", "kb_check"],
  privateManifestAccess: false,
};

describe("offline evaluator vertical slice", () => {
  test("returns a deterministic hard pass for correct state and protocol", () => {
    const first = runPrototype(successScenario);
    const second = runPrototype(successScenario);

    expect(first).toEqual(second);
    expect(first.hard).toBe(true);
    expect(first.soft).toBe(1);
    expect(first.criticalFailure).toBeUndefined();
  });

  test("rejects a wrong final state", () => {
    const receipt = runPrototype({
      ...successScenario,
      id: "prototype-wrong-state",
      finalState: "wrong",
    });

    expect(receipt.hard).toBe(false);
    expect(receipt.soft).toBe(0);
    expect(receipt.criticalFailure).toBe("final_state_mismatch");
  });

  test("rejects a missing required MCP call", () => {
    const receipt = runPrototype({
      ...successScenario,
      id: "prototype-missing-call",
      mcpCalls: ["kb_search"],
    });

    expect(receipt.hard).toBe(false);
    expect(receipt.soft).toBe(0);
    expect(receipt.criticalFailure).toBe("missing_required_call");
  });

  test("rejects access to a private scoring manifest", () => {
    const receipt = runPrototype({
      ...successScenario,
      id: "prototype-private-access",
      privateManifestAccess: true,
    });

    expect(receipt.hard).toBe(false);
    expect(receipt.soft).toBe(0);
    expect(receipt.criticalFailure).toBe("private_manifest_access");
  });

  test("CLI emits one machine-readable prototype receipt", () => {
    const process = Bun.spawnSync([
      "bun",
      "run",
      "scripts/skillopt-eval/cli.ts",
      "prototype",
      "--run-id",
      "cli-prototype",
    ]);

    expect(process.exitCode).toBe(0);
    expect(JSON.parse(process.stdout.toString())).toEqual({
      id: "cli-prototype",
      hard: true,
      soft: 1,
    });
  });
});
