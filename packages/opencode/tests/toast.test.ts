import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";

import { type ToastPayload, sendToast } from "../src/toast";

describe("sendToast", () => {
  test("prefers legacy tui.toast transport", async () => {
    const toastCalls: unknown[] = [];
    let showToastCalls = 0;
    const client = {
      tui: {
        toast: async (payload: unknown) => {
          toastCalls.push(payload);
        },
        showToast: async () => {
          showToastCalls += 1;
        },
      },
    };
    const payload: ToastPayload = { message: "hello" };

    const result = await sendToast(client, payload);

    assert.equal(toastCalls.length, 1);
    assert.deepEqual(toastCalls[0], payload);
    assert.equal(showToastCalls, 0);
    assert.deepEqual(result, { status: "delivered", transport: "legacy" });
  });

  test("calls tui.showToast with wrapped body", async () => {
    const showToastCalls: unknown[] = [];
    const client = {
      tui: {
        showToast: async (wrappedPayload: unknown) => {
          showToastCalls.push(wrappedPayload);
        },
      },
    };
    const payload: ToastPayload = { message: "hello", variant: "success" };

    const result = await sendToast(client, payload);

    assert.equal(showToastCalls.length, 1);
    assert.deepEqual(showToastCalls[0], { body: payload });
    assert.deepEqual(result, { status: "delivered", transport: "sdk" });
  });

  test("returns unavailable result when no toast capability exists", async () => {
    const payload: ToastPayload = { message: "hello" };

    const result = await sendToast({}, payload);

    assert.deepEqual(result, {
      status: "unavailable",
      reason: "missing-capability",
    });
  });

  test("returns failed result when showToast rejects", async () => {
    const payload: ToastPayload = { message: "hello" };
    const client = {
      tui: {
        showToast: async () => {
          throw new Error("boom");
        },
      },
    };

    const result = await sendToast(client, payload);

    assert.deepEqual(result, {
      status: "failed",
      transport: "sdk",
      reason: "rejected",
      error: "boom",
    });
  });

  test("returns failed result when showToast times out", async () => {
    const payload: ToastPayload = { message: "hello" };
    const client = {
      tui: {
        showToast: () => new Promise<void>(() => {}),
      },
    };

    const result = await sendToast(client, payload);

    assert.deepEqual(result, {
      status: "failed",
      transport: "sdk",
      reason: "timed-out",
      error: "showToast timed out",
    });
  });

  test("does not use fetch or console.error", async () => {
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;

    try {
      globalThis.fetch = (() => {
        throw new Error("fetch should not be called");
      }) as unknown as typeof fetch;
      console.error = (() => {
        throw new Error("console.error should not be called");
      }) as typeof console.error;

      const result = await sendToast({}, { message: "hello" });

      assert.deepEqual(result, {
        status: "unavailable",
        reason: "missing-capability",
      });
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
    }
  });
});
