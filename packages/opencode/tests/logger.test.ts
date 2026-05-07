import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../src/logger";

describe("opencode/logger", () => {
  beforeEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  it("setClient stores client correctly and resetClient clears it", () => {
    const mockClient = { app: { log: vi.fn().mockResolvedValue(undefined) } };
    logger.setClient(mockClient as any);
    logger.info("hello");
    logger.resetClient();
    expect(() => logger.info("after-reset")).not.toThrow();
  });

  it("info() with client calls client.app.log with correct payload", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    logger.setClient(mockClient as any);

    logger.info("my-info");

    await Promise.resolve();

    expect(mockLog).toHaveBeenCalledTimes(1);
    const arg = mockLog.mock.calls[0][0] as any;
    expect(arg).toHaveProperty("body");
    expect(arg.body).toMatchObject({
      service: "kibi-opencode",
      level: "info",
      message: "my-info",
    });
  });

  it("info() without client is silent and does not throw", () => {
    expect(() => logger.info("no-client")).not.toThrow();
  });

  it("warn() with client calls client.app.log with correct payload", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    logger.setClient(mockClient as any);

    logger.warn("my-warn");
    await Promise.resolve();

    expect(mockLog).toHaveBeenCalledTimes(1);
    const arg = mockLog.mock.calls[0][0] as any;
    expect(arg.body).toMatchObject({
      service: "kibi-opencode",
      level: "warn",
      message: "my-warn",
    });
  });

  it("warn() without client is silent and does not throw", () => {
    expect(() => logger.warn("no-client-warn")).not.toThrow();
  });

  it("error() with client calls console.error and client.app.log", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.setClient(mockClient as any);

    logger.error("fatal");
    await Promise.resolve();

    expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "fatal");
    expect(mockLog).toHaveBeenCalledTimes(1);
    const arg = mockLog.mock.calls[0][0] as any;
    expect(arg.body).toMatchObject({
      service: "kibi-opencode",
      level: "error",
      message: "fatal",
    });
  });

  it("error() without client still calls console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.resetClient();
    logger.error("only-console");
    expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "only-console");
  });

  it("info rejection remains terminal-silent", async () => {
    const err = new Error("boom");
    const mockLog = vi.fn().mockRejectedValue(err);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.setClient(mockClient as any);
    logger.info("will-reject");

    await Promise.resolve();

    expect(spy).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledTimes(1);
  });

  it("error logs only once when structured logging rejects", async () => {
    const err = new Error("structured-boom");
    const mockLog = vi.fn().mockRejectedValue(err);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.setClient(mockClient as any);
    logger.error("operational-failure");

    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "operational-failure");
    expect(mockLog).toHaveBeenCalledTimes(1);
  });

  it("multiple log calls in sequence work as expected", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.setClient(mockClient as any);

    logger.info("i1");
    logger.warn("w1");
    logger.error("e1");

    await Promise.resolve();

    expect(mockLog).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "e1");
  });
});

describe("failure-routing contract", () => {
  beforeEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  describe("errorStructuredOnly (advisory background failures)", () => {
    it("with client: routes to client.app.log only, never console.error", async () => {
      const mockLog = vi.fn().mockResolvedValue(undefined);
      const mockClient = { app: { log: mockLog } };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.setClient(mockClient as any);

      logger.errorStructuredOnly("scheduler.sync.failed", {
        event: "scheduler_sync_failed",
        exitCode: 1,
      });

      await Promise.resolve();

      // MUST route to client.app.log
      expect(mockLog).toHaveBeenCalledTimes(1);
      const arg = mockLog.mock.calls[0][0] as any;
      expect(arg).toHaveProperty("body");
      expect(arg.body).toMatchObject({
        service: "kibi-opencode",
        level: "error",
        message: "scheduler.sync.failed",
        event: "scheduler_sync_failed",
        exitCode: 1,
      });

      // MUST NOT call console.error when client is bound
      expect(spy).not.toHaveBeenCalled();
    });

    it("without client: is completely silent (no console.error)", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.resetClient();

      logger.errorStructuredOnly("advisory-no-client");

      // Advisory: MUST NOT call console.error even without client
      expect(spy).not.toHaveBeenCalled();
    });

    it("without client and no console.error: does not throw", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.resetClient();
      expect(() => logger.errorStructuredOnly("silent-advisory")).not.toThrow();
    });

    it("handles client.app.log rejection gracefully", async () => {
      const err = new Error("structured-oom");
      const mockLog = vi.fn().mockRejectedValue(err);
      const mockClient = { app: { log: mockLog } };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.setClient(mockClient as any);

      expect(() => logger.errorStructuredOnly("will-reject")).not.toThrow();
      await Promise.resolve();

      // Advisory/background logging must stay silent even if client.app.log()
      // rejects; graceful handling means no throw and no console.error noise.
      expect(spy).not.toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledTimes(1);
    });

    it("does not throw synchronously regardless of client state", () => {
      expect(() =>
        logger.errorStructuredOnly("sync-safe-no-client"),
      ).not.toThrow();

      const mockLog = vi
        .fn()
        .mockImplementation(() => Promise.reject(new Error("x")));
      logger.setClient({ app: { log: mockLog } } as any);
      expect(() =>
        logger.errorStructuredOnly("sync-safe-with-client"),
      ).not.toThrow();
    });
  });

  describe("error (operational plugin failures)", () => {
    it("with client: routes to both console.error and client.app.log", async () => {
      const mockLog = vi.fn().mockResolvedValue(undefined);
      const mockClient = { app: { log: mockLog } };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.setClient(mockClient as any);

      logger.error("bootstrap-needed", { event: "workspace_bootstrap_needed" });

      await Promise.resolve();

      // Operational: MUST be visible in terminal
      expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "bootstrap-needed");
      // AND in structured logs
      expect(mockLog).toHaveBeenCalledTimes(1);
      const arg = mockLog.mock.calls[0][0] as any;
      expect(arg.body.level).toBe("error");
      expect(arg.body.event).toBe("workspace_bootstrap_needed");
    });

    it("without client: still routes to console.error for visibility", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.resetClient();

      logger.error("init-failed");

      expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "init-failed");
    });
  });

  describe("contract enforcement: advisory vs operational separation", () => {
    it("errorStructuredOnly and error are distinct surfaces", async () => {
      const mockLog = vi.fn().mockResolvedValue(undefined);
      const mockClient = { app: { log: mockLog } };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.setClient(mockClient as any);

      // Advisory: no console.error
      logger.errorStructuredOnly("advisory-event");
      // Operational: console.error
      logger.error("operational-event");

      await Promise.resolve();

      // errorStructuredOnly: client.app.log only
      // error: client.app.log + console.error
      expect(mockLog).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("[kibi-opencode]", "operational-event");
    });
  });
});

// Task 1 TDD: Advisory check failures should NOT produce raw console.error
describe("advisory check failure noise regression", () => {
  beforeEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    logger.resetClient();
    vi.restoreAllMocks();
  });

  it("check.failed with single rule (symbol-traceability) uses errorStructuredOnly", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.setClient(mockClient as any);

    // Advisory background check failures use errorStructuredOnly
    const payload = JSON.stringify({
      rules: ["symbol-traceability"],
      exitCode: 1,
    });
    logger.errorStructuredOnly(`check.failed ${payload}`);

    await Promise.resolve();

    // Advisory: MUST NOT call console.error when client is bound
    expect(spy).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledTimes(1);
    const arg = mockLog.mock.calls[0][0] as any;
    expect(arg.body).toMatchObject({
      service: "kibi-opencode",
      level: "error",
    });
    expect(arg.body.message).toContain("check.failed");
    expect(arg.body.message).toContain("symbol-traceability");
  });

  it("check.failed with multi-rule payload uses errorStructuredOnly", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.setClient(mockClient as any);

    // Advisory multi-rule check failure
    const payload = JSON.stringify({
      rules: ["required-fields", "no-dangling-refs", "strict-fact-shape"],
      exitCode: 1,
    });
    logger.errorStructuredOnly(`check.failed ${payload}`);

    await Promise.resolve();

    // Advisory: MUST NOT call console.error
    expect(spy).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledTimes(1);
    const arg = mockLog.mock.calls[0][0] as any;
    expect(arg.body.message).toContain("check.failed");
    expect(arg.body.message).toContain("strict-fact-shape");
  });

  it("operational sync.failed still calls console.error via error() (control)", async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.setClient(mockClient as any);

    // Operational/startup failures use error() and SHOULD hit console.error
    logger.error("sync.failed something broke");

    await Promise.resolve();

    expect(spy).toHaveBeenCalledWith(
      "[kibi-opencode]",
      "sync.failed something broke",
    );
    expect(mockLog).toHaveBeenCalledTimes(1);
  });
});
