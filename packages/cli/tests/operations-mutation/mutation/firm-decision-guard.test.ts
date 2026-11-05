import { afterEach, describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import { assertFirmDecisionUnchanged } from "../../../src/operations/mutation/firm-decision-guard.js";
import type { StoredEntity } from "../../../src/operations/mutation/stored-entity.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import { cleanupWorkspaces, workspace, writeIn } from "../workspace.js";

afterEach(cleanupWorkspaces);

const lookupOf = (stored: StoredEntity) => ({
  exists: async () => stored !== undefined,
  entity: async () => stored,
});

const REQ_GUIDANCE =
  "Ask the person who stated it. If they agree, either write the change with origin.ref or approval_ref pointing at their words, or supersede it with a new firmness: firm decision that cites them; otherwise leave it and propose the change";
const ADR_GUIDANCE =
  "Ask the person who stated it. If they agree, either write the change with origin.ref pointing at their words, or supersede it with a new firmness: firm decision that cites them; otherwise leave it and propose the change";

async function rejection(promise: Promise<void>): Promise<KbRejection> {
  try {
    await promise;
  } catch (error) {
    return error as KbRejection;
  }
  throw new Error("expected a rejection");
}

const input = (
  type: string,
  properties: Record<string, unknown>,
  body?: string,
): UpsertInput => ({
  type,
  id: `${type.toUpperCase()}-1`,
  properties,
  ...(body === undefined ? {} : { document: { body } }),
});

describe("assertFirmDecisionUnchanged", () => {
  test("ignores types without firmness and missing or unreadable entities", async () => {
    const root = workspace();
    const throwing = {
      exists: async () => true,
      entity: async (): Promise<StoredEntity> => {
        throw new Error("must not load");
      },
    };
    await expect(
      assertFirmDecisionUnchanged(
        input("scenario", { title: "x" }),
        root,
        throwing,
      ),
    ).resolves.toBeUndefined();
    for (const stored of [undefined, null]) {
      await expect(
        assertFirmDecisionUnchanged(
          input("req", { title: "x" }),
          root,
          lookupOf(stored),
        ),
      ).resolves.toBeUndefined();
    }
  });

  test("judges the stored data when there is no authored document", async () => {
    const root = workspace();
    const stored = {
      title: "Old",
      firmness: "firm",
      semantic_text: "Orders ship.",
      source: "mcp://kibi/upsert",
    };
    const error = await rejection(
      assertFirmDecisionUnchanged(
        input("req", { title: "New" }),
        root,
        lookupOf(stored),
      ),
    );
    expect(error).toBeInstanceOf(KbRejection);
    expect(error.code).toBe("FIRM_DECISION_LOCKED");
    expect(error.message).toBe(
      `Entity validation failed: REQ-1 is a firm decision, so kb_upsert does not change its title in place. ${REQ_GUIDANCE}.`,
    );
    await expect(
      assertFirmDecisionUnchanged(
        input("req", { title: "Old" }, "Any body.\n"),
        root,
        lookupOf(stored),
      ),
    ).resolves.toBeUndefined();
    for (const source of [".kb/requirements/missing.md", 7]) {
      await expect(
        assertFirmDecisionUnchanged(
          input("req", { title: "New" }),
          root,
          lookupOf({ ...stored, source }),
        ),
      ).rejects.toThrow("change its title in place");
    }
  });

  test("judges the authored document over the stored data", async () => {
    const root = workspace();
    writeIn(
      root,
      ".kb/adr/ADR-1.md",
      "---\nid: ADR-1\ntype: adr\ntitle: Use X\nfirmness: firm\n---\nWe use X.\n",
    );
    const stored = { title: "Use X", source: ".kb/adr/ADR-1.md" };
    await expect(
      assertFirmDecisionUnchanged(input("adr", {}), root, lookupOf(stored)),
    ).resolves.toBeUndefined();
    const error = await rejection(
      assertFirmDecisionUnchanged(
        input("adr", { title: "Use Y" }, "We use Y.\n"),
        root,
        lookupOf(stored),
      ),
    );
    expect(error.message).toBe(
      `Entity validation failed: ADR-1 is a firm decision, so kb_upsert does not change its title, body in place. ${ADR_GUIDANCE}.`,
    );
  });

  test("falls back to the stored data for a document without front matter", async () => {
    const root = workspace();
    writeIn(root, ".kb/adr/ADR-1.md", "No front matter.\n");
    await expect(
      assertFirmDecisionUnchanged(
        input("adr", { title: "Use Y" }),
        root,
        lookupOf({
          title: "Use X",
          firmness: "firm",
          source: ".kb/adr/ADR-1.md",
        }),
      ),
    ).rejects.toThrow("change its title in place");
  });

  test("lets a retired decision and a cited change through", async () => {
    const root = workspace();
    writeIn(
      root,
      ".kb/requirements/REQ-1.md",
      "---\nid: REQ-1\ntype: req\ntitle: Old\nfirmness: firm\nstatus: deprecated\n---\nOrders ship.\n",
    );
    await expect(
      assertFirmDecisionUnchanged(
        input("req", { title: "New" }),
        root,
        lookupOf({ source: ".kb/requirements/REQ-1.md", firmness: "firm" }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      assertFirmDecisionUnchanged(
        input("req", {
          title: "New",
          origin: { kind: "human", ref: "https://example.test/ticket/1" },
        }),
        root,
        lookupOf({ title: "Old", firmness: "firm" }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("assertFirmDecisionUnchanged sources", () => {
  test("reads only markdown documents", async () => {
    const root = workspace();
    writeIn(
      root,
      ".kb/adr/ADR-1.txt",
      "---\nid: ADR-1\ntype: adr\ntitle: Use X\nfirmness: firm\n---\nWe use X.\n",
    );
    await expect(
      assertFirmDecisionUnchanged(
        input("adr", { title: "Use Y" }),
        root,
        lookupOf({
          title: "Use X",
          firmness: "default",
          source: ".kb/adr/ADR-1.txt",
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
