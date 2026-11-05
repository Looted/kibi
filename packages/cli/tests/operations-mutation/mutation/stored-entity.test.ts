import { describe, expect, test } from "bun:test";
import { storedEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

const ROW = `[['REQ-1',req,[title="T"]]]`;

describe("storedEntityLookup", () => {
  test("probes once and loads the stored entity once", async () => {
    const fake = scriptedProlog([ok(), ok({ Results: ROW })]);
    const lookup = storedEntityLookup(fake.prolog, "REQ-'1", "req");
    expect(Object.keys(lookup).sort()).toStrictEqual(["entity", "exists"]);
    expect(await lookup.exists()).toBe(true);
    expect(await lookup.exists()).toBe(true);
    expect(await lookup.entity()).toStrictEqual({
      title: "T",
      id: "REQ-1",
      type: "req",
    });
    expect(await lookup.entity()).toStrictEqual({
      title: "T",
      id: "REQ-1",
      type: "req",
    });
    expect(fake.goals).toStrictEqual([
      "once(kb_entity('REQ-''1', _, _))",
      "findall(['REQ-''1','req',Props], kb_entity('REQ-''1', 'req', Props), Results)",
    ]);
  });

  test("is undefined without loading when nothing is stored", async () => {
    const fake = scriptedProlog([fail()]);
    const lookup = storedEntityLookup(fake.prolog, "REQ-1", "req");
    expect(await lookup.entity()).toBeUndefined();
    expect(await lookup.exists()).toBe(false);
    expect(fake.goals).toHaveLength(1);
  });

  test("is null when the stored entity cannot be read", async () => {
    const empty = scriptedProlog([ok(), ok()]);
    expect(
      await storedEntityLookup(empty.prolog, "REQ-1", "req").entity(),
    ).toBeNull();
    const broken = scriptedProlog([ok(), fail("engine down")]);
    expect(
      await storedEntityLookup(broken.prolog, "REQ-1", "req").entity(),
    ).toBeNull();
  });
});
