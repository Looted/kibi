import { describe, expect, test } from "bun:test";
import {
  saveAtomicMutation,
  saveMutation,
} from "../../../src/operations/mutation/save.js";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

function saving(result: ReturnType<typeof ok>) {
  const events: string[] = [];
  const prolog: PrologPort = {
    query: async () => ok(),
    nextSolution: async () => null,
    save: async () => {
      events.push("save");
      return result;
    },
    invalidateCache: () => {
      events.push("invalidate");
    },
  };
  return { prolog, events };
}

describe("saveMutation", () => {
  test("invalidates the cache before saving", async () => {
    const { prolog, events } = saving(ok());
    await saveMutation(prolog);
    expect(events).toStrictEqual(["invalidate", "save"]);
  });

  test("works on a port without a cache", async () => {
    const { prolog } = saving(ok());
    prolog.invalidateCache = undefined;
    await expect(saveMutation(prolog)).resolves.toBeUndefined();
  });

  test("reports the default upsert operation and the engine error", async () => {
    const { prolog } = saving(fail("disk full"));
    await expect(saveMutation(prolog)).rejects.toThrow(
      /^Failed to save KB after upsert: disk full$/,
    );
  });

  test("reports delete and an unknown error", async () => {
    const { prolog } = saving(fail());
    await expect(saveMutation(prolog, "delete")).rejects.toThrow(
      /^Failed to save KB after delete: Unknown error$/,
    );
  });
});

describe("saveAtomicMutation", () => {
  test("wraps the goals and kb_save in one transaction, then invalidates", async () => {
    const fake = scriptedProlog([ok()]);
    await saveAtomicMutation(fake.prolog, ["a(1)", "b(2)"], "delete");
    expect(fake.goals).toStrictEqual([
      "rdf_transaction((a(1), b(2), kb_save))",
    ]);
    expect(fake.invalidations).toStrictEqual(["after:1"]);
  });

  test("works on a port without a cache", async () => {
    const fake = scriptedProlog([ok()]);
    fake.prolog.invalidateCache = undefined;
    await expect(
      saveAtomicMutation(fake.prolog, [], "delete"),
    ).resolves.toBeUndefined();
    expect(fake.goals).toStrictEqual(["rdf_transaction((kb_save))"]);
  });

  test("throws without invalidating when the transaction fails", async () => {
    const fake = scriptedProlog([fail("boom")]);
    await expect(
      saveAtomicMutation(fake.prolog, ["a"], "delete"),
    ).rejects.toThrow(/^Failed to save KB after delete: boom$/);
    expect(fake.invalidations).toStrictEqual([]);
    const unknown = scriptedProlog([fail()]);
    await expect(
      saveAtomicMutation(unknown.prolog, ["a"], "delete"),
    ).rejects.toThrow(/^Failed to save KB after delete: Unknown error$/);
  });
});
