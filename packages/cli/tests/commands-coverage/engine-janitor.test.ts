import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { engineJanitorCommand } from "../../src/commands/engine.js";
import * as engine from "../../src/engine.js";
import * as janitor from "../../src/prolog/janitor.js";

afterEach(() => {
  mock.restore();
});

const findings = [
  {
    kind: "takeover-record",
    recordPath: "/r/takeover.json",
    at: "2026-01-01T00:00:00Z",
    action: "clean",
  },
  {
    kind: "store-lock",
    storePath: "/s/store",
    pid: 42,
    workspaceRoot: "/ws",
    holderState: "dead",
    action: "clean",
  },
  {
    kind: "store-lock",
    storePath: "/s/other",
    holderState: "alive",
    action: "keep",
  },
  {
    kind: "socket",
    socketPath: "/run/kibi.sock",
    holderState: "dead",
    action: "clean",
  },
];

function stub(result: unknown[]): unknown[] {
  const calls: unknown[] = [];
  spyOn(engine, "runtimeDirectory").mockReturnValue("/runtime");
  spyOn(janitor, "runJanitor").mockImplementation(((options: unknown) => {
    calls.push(options);
    return result;
  }) as never);
  return calls;
}

function captureLog(): string[] {
  const logs: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  return logs;
}

describe("engineJanitorCommand", () => {
  test("reports every finding without cleaning by default", async () => {
    const calls = stub(findings);
    const logs = captureLog();
    await engineJanitorCommand({});
    expect(calls).toStrictEqual([
      {
        workspaceRoot: expect.any(String),
        runtimeDirectory: "/runtime",
        all: false,
        apply: false,
      },
    ]);
    expect(logs).toStrictEqual([
      "[clean] takeover record /r/takeover.json at=2026-01-01T00:00:00Z (past the kb_status notice window)",
      "[clean] store /s/store pid=42 workspace=/ws holder=dead",
      "[keep] store /s/other holder=alive",
      "[clean] socket /run/kibi.sock holder=dead",
      "4 finding(s), 3 cleanable (report only; re-run with --apply)",
    ]);
  });

  test("counts cleaned findings when applying", async () => {
    const calls = stub(findings);
    const logs = captureLog();
    await engineJanitorCommand({ apply: true, all: true });
    expect((calls[0] as { apply: boolean; all: boolean }).apply).toBe(true);
    expect((calls[0] as { apply: boolean; all: boolean }).all).toBe(true);
    expect(logs.at(-1)).toBe("4 finding(s), 3 cleaned");
  });

  test("prints JSON totals", async () => {
    stub(findings);
    const logs = captureLog();
    await engineJanitorCommand({ format: "json", apply: true });
    expect(JSON.parse(logs[0] ?? "")).toStrictEqual({
      findings,
      cleaned: 3,
      cleanable: 3,
      total: 4,
    });
  });

  test("says when nothing was found", async () => {
    stub([]);
    const logs = captureLog();
    await engineJanitorCommand({});
    expect(logs).toStrictEqual(["No engine or lock artifacts found."]);
  });
});
