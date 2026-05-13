import { describe, expect, test } from "bun:test";
import { sendToast } from "../src/toast";

describe("sendToast timeout handling", () => {
  test("returns timed-out failure when showToast never resolves", async () => {
    const result = await sendToast(
      {
        tui: {
          showToast: () => new Promise(() => {}),
        },
      },
      { message: "hello" },
    );

    expect(result).toEqual({
      status: "failed",
      transport: "sdk",
      reason: "timed-out",
      error: "showToast timed out",
    });
  });

  test("uses legacy toast transport when available", async () => {
    const calls: Array<{ message: string }> = [];
    const result = await sendToast(
      {
        tui: {
          toast: async (payload) => {
            calls.push({ message: payload.message });
          },
        },
      },
      { message: "legacy" },
    );

    expect(calls).toEqual([{ message: "legacy" }]);
    expect(result).toEqual({ status: "delivered", transport: "legacy" });
  });
});
