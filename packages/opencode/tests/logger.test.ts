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

  it("handles client.app.log rejection gracefully and logs the rejection to console.error", async () => {
    const err = new Error("boom");
    const mockLog = vi.fn().mockRejectedValue(err);
    const mockClient = { app: { log: mockLog } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.setClient(mockClient as any);
    logger.info("will-reject");

    await Promise.resolve();

    expect(spy).toHaveBeenCalled();
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
