/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { MutationSaga } from "../../src/operations/mutation/saga.js";

describe("MutationSaga", () => {
  test("rolls back steps in reverse order exactly once", async () => {
    const order: string[] = [];
    const saga = new MutationSaga();
    saga.add({
      name: "first",
      rollback: () => {
        order.push("first");
      },
    });
    saga.add({
      name: "second",
      rollback: () => {
        order.push("second");
      },
    });
    await saga.rollback();
    await saga.rollback();
    expect(order).toEqual(["second", "first"]);
  });

  test("swallows swallow-policy rollback errors and captures capture-policy ones", async () => {
    const saga = new MutationSaga();
    saga.add({
      name: "quiet",
      rollback: () => {
        throw new Error("swallowed");
      },
    });
    saga.add({
      name: "loud",
      rollback: () => {
        throw new Error("captured");
      },
      onError: "capture",
    });
    const failures = await saga.rollback();
    expect(failures).toEqual([
      { step: "loud", error: new Error("captured") },
    ]);
  });

  test("rollback is a no-op after markCommitted", async () => {
    let rolledBack = false;
    const saga = new MutationSaga();
    saga.add({
      name: "step",
      rollback: () => {
        rolledBack = true;
      },
    });
    saga.markCommitted();
    const failures = await saga.rollback();
    expect(failures).toEqual([]);
    expect(rolledBack).toBe(false);
    expect(saga.committed).toBe(true);
  });

  test("awaits async rollbacks", async () => {
    const saga = new MutationSaga();
    let done = false;
    saga.add({
      name: "async",
      rollback: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        done = true;
      },
    });
    await saga.rollback();
    expect(done).toBe(true);
  });
});
