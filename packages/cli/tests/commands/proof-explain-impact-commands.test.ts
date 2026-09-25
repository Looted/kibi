import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { proofExplainCommand } from "../../src/commands/proof-explain.js";
import { proofImpactCommand } from "../../src/commands/proof-impact.js";
import * as explain from "../../src/operations/proof/explain.js";
import * as impact from "../../src/operations/proof/impact.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";

const restores: Array<() => void> = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

type CloseCall = {
  status: string;
};

function fakeRuntime(closes: CloseCall[]) {
  const context = { prolog: undefined } as never;
  const runtime = {
    open: async () => context,
    afterSuccess: async () => undefined,
    close: async (_operation: unknown, outcome: { status: string }) => {
      closes.push({ status: outcome.status });
    },
  };
  const runtimeSpy = spyOn(cliRuntime, "createCliRuntime").mockReturnValue(
    runtime as never,
  );
  restores.push(() => runtimeSpy.mockRestore());
}

function captureStdout(output: string[]) {
  const write = spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    output.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  restores.push(() => write.mockRestore());
}

describe("proof explain command wrapper", () => {
  test("writes the explain view as JSON in json mode", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const view = {
      kind: "requirement" as const,
      id: "REQ-EXAMPLE",
      proofStatus: "missing",
    };
    const operation = spyOn(explain, "executeProofExplain").mockResolvedValue({
      view,
      payload: { view },
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    await expect(
      proofExplainCommand({ id: "REQ-EXAMPLE", json: true }),
    ).resolves.toEqual({ exitCode: 0 });
    expect(operation.mock.calls[0]?.[0]).toEqual({
      kind: "requirement",
      id: "REQ-EXAMPLE",
    });
    expect(JSON.parse(output.join(""))).toEqual(view);
    expect(closes).toEqual([{ status: "success" }]);
  });

  test("writes rendered text by default and closes with error on failure", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const render = spyOn(explain, "renderProofExplain").mockReturnValue(
      "rendered-explain-view",
    );
    restores.push(() => render.mockRestore());
    const operation = spyOn(explain, "executeProofExplain").mockRejectedValue(
      new Error("explain exploded"),
    );
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    await expect(
      proofExplainCommand({ requirement: "REQ-EXAMPLE" }),
    ).rejects.toThrow("explain exploded");
    expect(output.join("")).toBe("");
    expect(closes).toEqual([{ status: "error" }]);
  });

  test("writes rendered text when the explain succeeds", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const view = {
      kind: "symbol" as const,
      id: "SYM-EXAMPLE",
      proofStatus: "covered",
    };
    const operation = spyOn(explain, "executeProofExplain").mockResolvedValue({
      view,
      payload: { view },
    } as never);
    restores.push(() => operation.mockRestore());
    const render = spyOn(explain, "renderProofExplain").mockReturnValue(
      "rendered-explain-view",
    );
    restores.push(() => render.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    await expect(
      proofExplainCommand({ symbol: "SYM-EXAMPLE" }),
    ).resolves.toEqual({ exitCode: 0 });
    expect(operation.mock.calls[0]?.[0]).toEqual({
      kind: "symbol",
      id: "SYM-EXAMPLE",
    });
    expect(output.join("")).toBe("rendered-explain-view");
    expect(closes).toEqual([{ status: "success" }]);
  });
});

describe("proof impact command wrapper", () => {
  test("writes the impact result as JSON in json mode", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const result = { requirements: 104, proven: 66, changes: [] };
    const operation = spyOn(impact, "executeProofImpact").mockResolvedValue({
      result,
      text: "impact-text",
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    await expect(proofImpactCommand({ json: true })).resolves.toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(output.join(""))).toEqual(result);
    expect(output.join("")).not.toContain("impact-text");
    expect(closes).toEqual([{ status: "success" }]);
  });

  test("exits 0 even when the impact comparison reports changes (diagnostic-only)", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const operation = spyOn(impact, "executeProofImpact").mockResolvedValue({
      result: {
        requirements: 104,
        proven: 65,
        changes: [{ requirement: "REQ-EXAMPLE", kind: "regressed" }],
      },
      text: "impact-text-with-changes",
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    // `proof impact` is diagnostic: successful evaluation always exits 0.
    // Regression enforcement lives in the baseline ratchet
    // (scripts/check-proof-baseline.mjs), not in the report command.
    await expect(proofImpactCommand({})).resolves.toEqual({ exitCode: 0 });
    expect(output.join("")).toContain("impact-text-with-changes");
    expect(closes).toEqual([{ status: "success" }]);
  });

  test("writes rendered impact text by default", async () => {
    const closes: CloseCall[] = [];
    fakeRuntime(closes);
    const operation = spyOn(impact, "executeProofImpact").mockResolvedValue({
      result: { requirements: 104, proven: 66, changes: [] },
      text: "impact-text",
    } as never);
    restores.push(() => operation.mockRestore());
    const output: string[] = [];
    captureStdout(output);

    await expect(proofImpactCommand({})).resolves.toEqual({ exitCode: 0 });
    expect(output.join("")).toContain("impact-text");
    expect(closes).toEqual([{ status: "success" }]);
  });
});
