import { describe, expect, test } from "bun:test";
import { resolveUpsertOrigin } from "../../../src/operations/mutation/origin.js";
import type { StoredEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

const NOW = new Date("2026-01-02T03:04:05.000Z");
const input = (properties: Record<string, unknown> = {}): UpsertInput => ({
  type: "req",
  id: "REQ-1",
  properties: { title: "T", ...properties },
});
const lookupOf = (stored: Record<string, unknown> | null | undefined) =>
  ({
    exists: async () => stored !== undefined,
    entity: async () => stored,
  }) satisfies StoredEntityLookup;

describe("resolveUpsertOrigin", () => {
  test("stamps recorded_at on a supplied origin that lacks it", async () => {
    expect(
      await resolveUpsertOrigin(
        input({ origin: { kind: "human" } }),
        undefined,
        NOW,
      ),
    ).toStrictEqual({
      type: "req",
      id: "REQ-1",
      properties: {
        title: "T",
        origin: { kind: "human", recorded_at: "2026-01-02T03:04:05.000Z" },
      },
    });
  });

  test("keeps a supplied origin with recorded_at or a non-record origin", async () => {
    for (const origin of [
      { kind: "human", recorded_at: "2025-01-01" },
      "agent",
      ["agent"],
      null,
    ]) {
      const original = input({ origin });
      expect(await resolveUpsertOrigin(original, undefined, NOW)).toBe(
        original,
      );
    }
  });

  test("leaves the input alone without a Prolog runtime", async () => {
    const original = input();
    expect(await resolveUpsertOrigin(original, undefined, NOW)).toBe(original);
  });

  test("uses a staged entity's origin", async () => {
    const fake = scriptedProlog([fail()]);
    const staged = {
      entities: new Map([
        ["REQ-1", { origin: '{"kind":"import","ref":"x"}' }],
        ["REQ-2", {}],
      ]),
      relationships: [],
    };
    expect(
      (await resolveUpsertOrigin(input(), fake.prolog, NOW, staged)).properties,
    ).toStrictEqual({ title: "T", origin: { kind: "import", ref: "x" } });
    const noOrigin = { ...input(), id: "REQ-2" };
    expect(await resolveUpsertOrigin(noOrigin, fake.prolog, NOW, staged)).toBe(
      noOrigin,
    );
    expect(fake.goals).toStrictEqual([]);
  });

  test("records a new entity as agent-authored", async () => {
    const fake = scriptedProlog([fail()]);
    expect(
      (await resolveUpsertOrigin(input(), fake.prolog, NOW)).properties,
    ).toStrictEqual({
      title: "T",
      origin: { kind: "agent", recorded_at: "2026-01-02T03:04:05.000Z" },
    });
    expect(fake.goals).toStrictEqual(["once(kb_entity('REQ-1', _, _))"]);
  });

  test("keeps a stored origin and leaves out a missing or unreadable one", async () => {
    const fake = scriptedProlog([fail()]);
    expect(
      (
        await resolveUpsertOrigin(
          input(),
          fake.prolog,
          NOW,
          undefined,
          lookupOf({ origin: { kind: "human" } }),
        )
      ).properties,
    ).toStrictEqual({ title: "T", origin: { kind: "human" } });
    for (const stored of [{}, null]) {
      const original = input();
      expect(
        await resolveUpsertOrigin(
          original,
          fake.prolog,
          NOW,
          { entities: new Map(), relationships: [] },
          lookupOf(stored),
        ),
      ).toBe(original);
    }
    expect(fake.goals).toStrictEqual([]);
  });

  test("reads the stored entity through the store by default", async () => {
    const fake = scriptedProlog([
      ok(),
      ok({ Results: `[['REQ-1',req,[origin="{\\"kind\\":\\"human\\"}"]]]` }),
    ]);
    expect(
      (await resolveUpsertOrigin(input(), fake.prolog, NOW)).properties,
    ).toStrictEqual({ title: "T", origin: { kind: "human" } });
    expect(fake.goals[1]).toContain("kb_entity('REQ-1', 'req', Props)");
  });
});
