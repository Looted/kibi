import { afterEach, describe, expect, test } from "bun:test";
import { info, resetClient, setClient } from "../src/logger";
import { notifyStartup } from "../src/startup-notifier";

afterEach(() => {
  resetClient();
});

describe("logger resetClient", () => {
  test("unbinds the client", () => {
    const bodies: unknown[] = [];
    setClient({
      app: {
        log: async (payload) => {
          bodies.push(payload);
        },
      },
    });
    resetClient();
    info("after reset");
    expect(bodies).toStrictEqual([]);
  });
});

type Logged = Record<string, unknown>;

async function startup(cfg: Parameters<typeof notifyStartup>[1]) {
  const logs: Logged[] = [];
  const toasts: unknown[] = [];
  notifyStartup(
    {
      app: {
        log: async (payload) => {
          logs.push(payload.body as Logged);
        },
      },
      tui: {
        toast: (payload) => {
          toasts.push(payload);
        },
      },
    },
    cfg,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { logs, toasts };
}

describe("notifyStartup", () => {
  test("empty versions give the plain message and no version fields", async () => {
    const { logs, toasts } = await startup({ versions: {} });
    expect(toasts).toStrictEqual([
      {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started",
        duration: 4000,
      },
    ]);
    expect(logs[0]).toStrictEqual({
      service: "kibi-opencode",
      level: "info",
      message: "kibi-opencode started",
    });
  });

  test("no versions at all gives no version fields", async () => {
    const { logs } = await startup({ suppressToast: true });
    expect(logs).toStrictEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
      },
    ]);
  });

  test("known versions are listed and the rest reported unknown", async () => {
    const { logs, toasts } = await startup({ versions: { mcp: "2.0.0" } });
    expect((toasts[0] as { message: string }).message).toBe(
      "kibi-opencode started (mcp v2.0.0)",
    );
    expect(logs[0]).toStrictEqual({
      service: "kibi-opencode",
      level: "info",
      message: "kibi-opencode started",
      versions: { mcp: "2.0.0" },
      unknownVersions: ["opencode", "cli", "core"],
    });
  });
});
