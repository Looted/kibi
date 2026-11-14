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

describe("requirement clock dates", () => {
  const refusal = (field: string, value: string, why: string) =>
    `Entity validation failed: ${field} ${JSON.stringify(value)} ${why}. It starts the review grace period of an agent-written requirement, so it must be the real time the requirement was written: leave it out and kb_upsert records the write time.`;

  test("refuses a requirement created_at or origin.recorded_at that is not a past date", async () => {
    for (const [properties, field, value, why] of [
      [
        { created_at: "2030-01-01T00:00:00Z" },
        "created_at",
        "2030-01-01T00:00:00Z",
        "is later than now (2026-01-02T03:04:05.000Z)",
      ],
      [
        { created_at: "yesterday" },
        "created_at",
        "yesterday",
        "is not an ISO 8601 date or timestamp",
      ],
      [
        { origin: { kind: "agent", recorded_at: "2026-13-45T00:00:00Z" } },
        "origin.recorded_at",
        "2026-13-45T00:00:00Z",
        "is not an ISO 8601 date or timestamp",
      ],
      [
        {
          created_at: "2026-01-01T00:00:00Z",
          origin: { kind: "agent", recorded_at: "2026-01-04T00:00:00Z" },
        },
        "origin.recorded_at",
        "2026-01-04T00:00:00Z",
        "is later than now (2026-01-02T03:04:05.000Z)",
      ],
    ] as const) {
      // Refused before anything is resolved, even without a store.
      await expect(
        resolveUpsertOrigin(input(properties), undefined, NOW),
      ).rejects.toMatchObject({
        code: "ENTITY_VALIDATION_FAILED",
        message: refusal(field, value, why),
      });
    }
  });

  test("accepts past dates, a day of clock skew, other types and stored values", async () => {
    for (const properties of [
      {},
      { created_at: "2026-01-01" },
      { created_at: "2026-01-03T03:04:05.000Z" },
      { origin: { kind: "agent", recorded_at: "2025-12-31T23:00:00+01:00" } },
      { origin: { kind: "agent" } },
      { origin: "agent" },
    ])
      await expect(
        resolveUpsertOrigin(input(properties), undefined, NOW),
      ).resolves.toBeDefined();
    await expect(
      resolveUpsertOrigin(
        {
          type: "scenario",
          id: "SCEN-1",
          properties: { title: "T", created_at: "2030-01-01" },
        },
        undefined,
        NOW,
      ),
    ).resolves.toBeDefined();
    // A stored origin the write keeps is not the payload's statement.
    const stored = await resolveUpsertOrigin(
      input(),
      scriptedProlog([]).prolog,
      NOW,
      undefined,
      lookupOf({ origin: { kind: "agent", recorded_at: "2030-01-01" } }),
    );
    expect(stored.properties.origin).toEqual({
      kind: "agent",
      recorded_at: "2030-01-01",
    });
  });
});
