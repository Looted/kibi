import { describe, expect, test } from "bun:test";
import {
  MutationRollbackFailureError,
  MutationSaga,
} from "../../../src/operations/mutation/saga.js";

describe("MutationSaga", () => {
  test("rolls back in reverse order exactly once", async () => {
    const saga = new MutationSaga();
    const order: string[] = [];
    saga.add({ name: "a", rollback: () => void order.push("a") });
    saga.add({
      name: "b",
      rollback: async () => {
        order.push("b");
      },
    });
    expect(saga.committed).toBe(false);
    expect(await saga.rollback()).toStrictEqual([]);
    expect(order).toStrictEqual(["b", "a"]);
    expect(await saga.rollback()).toStrictEqual([]);
    expect(order).toStrictEqual(["b", "a"]);
  });

  test("captures only capture-policy failures and keeps going", async () => {
    const saga = new MutationSaga();
    const order: string[] = [];
    const boom = new Error("boom");
    saga.add({
      name: "captured",
      onError: "capture",
      rollback: () => {
        order.push("captured");
        throw boom;
      },
    });
    saga.add({
      name: "swallowed",
      onError: "swallow",
      rollback: () => {
        order.push("swallowed");
        throw new Error("hidden");
      },
    });
    saga.add({
      name: "default",
      rollback: () => {
        order.push("default");
        throw new Error("hidden too");
      },
    });
    expect(await saga.rollback()).toStrictEqual([
      { step: "captured", error: boom },
    ]);
    expect(order).toStrictEqual(["default", "swallowed", "captured"]);
  });

  test("does nothing once committed", async () => {
    const saga = new MutationSaga();
    let rolledBack = false;
    saga.add({ name: "a", rollback: () => void (rolledBack = true) });
    saga.markCommitted();
    expect(saga.committed).toBe(true);
    expect(await saga.rollback()).toStrictEqual([]);
    expect(rolledBack).toBe(false);
  });

  test("a saga committed before any step is still committed", async () => {
    const saga = new MutationSaga();
    saga.markCommitted();
    expect(saga.committed).toBe(true);
    let rolledBack = false;
    saga.add({ name: "late", rollback: () => void (rolledBack = true) });
    expect(await saga.rollback()).toStrictEqual([]);
    expect(rolledBack).toBe(false);
  });
});

describe("MutationRollbackFailureError", () => {
  test("is an aggregate carrying the rollback failures", () => {
    const original = new Error("original");
    const failures = [{ step: "a", error: new Error("rb") }];
    const error = new MutationRollbackFailureError(
      [original],
      "mutation failed",
      failures,
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.name).toBe("MutationRollbackFailureError");
    expect(error.message).toBe("mutation failed");
    expect(error.errors).toStrictEqual([original]);
    expect(error.rollbackFailures).toBe(failures);
  });
});
