import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  checkViolations,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Two value facts of current requirements that state one quantity under
 * different keys: kibi check blocks the pair (quantity-duplicate), kb_upsert
 * warns on a write that states or leaves stale the twin's value, distinct_from
 * records that they are different quantities, and kibi migrate lists the
 * pairs for review on the upgrade to schema 19.
 */

let workspace: ConsumerWorkspace;

function setProperty(factId: string, propertyKey: string): void {
  const file = path.join(workspace.root, `.kb/facts/${factId}.md`);
  writeFileSync(
    file,
    readFileSync(file, "utf8").replace(
      "property_key: remaining\n",
      `property_key: ${propertyKey}\n`,
    ),
  );
}

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-quantity-duplicate-");
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-ceiling",
    title: "A client has at most 500 calls",
    prose: "A client must have at most 500 remaining calls.",
    factId: "FACT-quota-ceiling",
    operator: "lte",
    value: 500,
  });
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-window-cap",
    title: "A quota window allows 500 calls",
    prose: "A quota window must allow at most 500 calls.",
    factId: "FACT-quota-window-cap",
    operator: "lte",
    value: 500,
  });
  setProperty("FACT-quota-window-cap", "window_cap");
  // Two facts sharing the number 1 in the same file are not one quantity.
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-floor",
    title: "A client keeps at least 1 call",
    prose: "A client must keep at least 1 remaining call.",
    factId: "FACT-quota-floor",
    operator: "gte",
    value: 1,
  });
  setProperty("FACT-quota-floor", "floor");
  authorQuotaRequirement(workspace, {
    id: "REQ-quota-window-floor",
    title: "A quota window allows at least 1 call",
    prose: "A quota window must allow at least 1 call.",
    factId: "FACT-quota-window-floor",
    operator: "gte",
    value: 1,
  });
  setProperty("FACT-quota-window-floor", "window_floor");
  workspace.write(
    "src/quota.ts",
    "export const QUOTA_CALLS = 500;\n\nexport function remainingCalls(used: number): number {\n  return QUOTA_CALLS - used;\n}\n",
  );
  workspace.write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-quota-remaining-calls\n    title: remainingCalls\n    sourceFile: src/quota.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-quota-ceiling\n      - type: implements\n        target: REQ-quota-window-cap\n  - id: SYM-quota-calls\n    title: QUOTA_CALLS\n    sourceFile: src/quota.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-quota-floor\n      - type: implements\n        target: REQ-quota-window-floor\n",
  );
  workspace.git("add", ".kb", "src");
  workspace.text(["sync"]);
}, 300_000);

afterAll(() => workspace?.cleanup());

function upsert(input: Json): { status: unknown; data: Json } {
  return workspace.json(["upsert"], input) as { status: unknown; data: Json };
}

function quantityNotes(result: { data: Json }): string[] {
  return ((result.data.warnings ?? []) as string[]).filter((warning) =>
    warning.startsWith("quantity-duplicate:"),
  );
}

function windowCapFact(value: number, extra: Json = {}): Json {
  const stored = workspace.read(".kb/facts/FACT-quota-window-cap.md");
  const field = (name: string): string =>
    new RegExp(`^${name}: (.*)$`, "m").exec(stored)?.[1]?.trim() ?? "";
  return {
    type: "fact",
    id: "FACT-quota-window-cap",
    properties: {
      title: field("title"),
      status: "active",
      fact_kind: "property_value",
      subject_key: "client.call_quota",
      property_key: "window_cap",
      operator: "lte",
      value_type: "int",
      value_int: value,
      claim_key: field("claim_key"),
      claim_text: field("claim_text"),
      ...extra,
    },
  };
}

describe("one quantity stated under two names", () => {
  test("kibi check blocks the pair and names both keys and the shared file", () => {
    const violations = checkViolations(workspace, "quantity-duplicate");
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "quantity-duplicate",
      entityId: "FACT-quota-ceiling",
    });
    expect(violations[0]?.description).toContain(
      "FACT-quota-ceiling (client.call_quota.remaining = 500) and FACT-quota-window-cap (client.call_quota.window_cap = 500) state one quantity under two names",
    );
    expect(violations[0]?.description).toContain("implemented in src/quota.ts");
  }, 300_000);

  test("a dry run that moves one name's value warns that the twin still states the old one", () => {
    const result = workspace.json(["upsert"], {
      ...windowCapFact(400),
      dryRun: true,
    }) as { status: unknown; data: Json };
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(quantityNotes(result)).toEqual([
      expect.stringContaining(
        "FACT-quota-window-cap (client.call_quota.window_cap) held 500 before this write, the value still stated by FACT-quota-ceiling (client.call_quota.remaining = 500)",
      ),
    ]);
    expect(workspace.read(".kb/facts/FACT-quota-window-cap.md")).toContain(
      "value_int: 500",
    );
  }, 300_000);

  test("a write that restates the twin's value names the pair", () => {
    const result = upsert(windowCapFact(500));
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(quantityNotes(result)).toEqual([
      expect.stringContaining(
        "FACT-quota-window-cap (client.call_quota.window_cap = 500) states the same quantity as FACT-quota-ceiling",
      ),
    ]);
  }, 300_000);

  test("distinct_from records two different quantities, and the check and the warning stop", () => {
    const result = upsert(
      windowCapFact(500, { distinct_from: ["client.call_quota.remaining"] }),
    );
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(quantityNotes(result)).toEqual([]);
    workspace.sync();
    expect(checkViolations(workspace, "quantity-duplicate")).toEqual([]);
  }, 300_000);

  test("a distinct_from entry that names no value fact is reported", () => {
    const result = upsert(
      windowCapFact(500, {
        distinct_from: [
          "client.call_quota.remaining",
          "client.call_quota.gone",
        ],
      }),
    );
    expect(result.status, JSON.stringify(result)).toBe("success");
    workspace.sync();
    const violations = checkViolations(workspace, "quantity-duplicate");
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "FACT-quota-window-cap",
    ]);
    expect(violations[0]?.description).toBe(
      "Value fact FACT-quota-window-cap lists client.call_quota.gone under distinct_from, but no active value fact has that subject_key and property_key, so the entry exempts nothing",
    );
  }, 300_000);

  test("kibi migrate lists the pair for review on the upgrade from schema 18, and writes nothing", () => {
    upsert(windowCapFact(500, { distinct_from: [] }));
    const manifestPath = ".kb/manifest.json";
    const manifest = JSON.parse(workspace.read(manifestPath)) as Json;
    expect(manifest.schemaVersion).toBe(20);
    workspace.write(
      manifestPath,
      `${JSON.stringify({ ...manifest, schemaVersion: 18 }, null, 2)}\n`,
    );
    expect(checkViolations(workspace, "quantity-duplicate")).toEqual([]);
    const dry = workspace.text(["migrate", "--dry-run"]);
    expect(dry).toContain(
      "dry run: Schema 19: quantity-duplicate now blocks two value facts of current requirements that state one quantity under different subject or property keys; 1 pair(s) found.",
    );
    const plan = workspace.json(["migrate", "--format", "json"]);
    const actions = JSON.stringify(plan);
    expect(actions).toContain('"code":"quantity_duplicate_review"');
    expect(actions).toContain(
      "quantity-duplicate-FACT-quota-ceiling-FACT-quota-window-cap",
    );
    expect(workspace.read(".kb/facts/FACT-quota-window-cap.md")).not.toContain(
      "distinct_from: [client",
    );
  }, 300_000);
  test("the pre-commit gate blocks a commit that drops the distinct_from, and not an unrelated one", () => {
    const manifestPath = ".kb/manifest.json";
    const manifest = JSON.parse(workspace.read(manifestPath)) as Json;
    workspace.write(
      manifestPath,
      `${JSON.stringify({ ...manifest, schemaVersion: 20 }, null, 2)}\n`,
    );
    upsert(
      windowCapFact(500, { distinct_from: ["client.call_quota.remaining"] }),
    );
    workspace.git("add", "-A");
    workspace.git("commit", "-q", "-m", "quota");
    const staged = () => {
      workspace.stage();
      const run = workspace.kibi(["check", "--staged", "--format", "json"]);
      const structured = (JSON.parse(run.stdout) as Json).structuredContent as {
        violations: Array<{ rule: string; entityId: string }>;
      };
      return {
        status: run.status,
        quantity: structured.violations
          .filter(({ rule }) => rule === "quantity-duplicate")
          .map(({ entityId }) => entityId),
      };
    };
    upsert(windowCapFact(500, { distinct_from: [] }));
    const blocked = staged();
    expect(blocked.quantity).toEqual(["FACT-quota-window-cap"]);
    expect(blocked.status).not.toBe(0);
    workspace.git("commit", "-q", "--no-verify", "-m", "split");
    workspace.write(
      ".kb/facts/FACT-QUOTA-SUBJECT.md",
      QUOTA_SUBJECT.replace(
        "it is not the account's billing plan.",
        "it is not the account's billing plan or its invoices.",
      ),
    );
    expect(staged().quantity).toEqual([]);
  }, 300_000);
  test("a requirement written with its value fact and its code in one call names the twin", () => {
    const prose = "A client must be capped at 500 calls per window.";
    const { propositions } = adviseProse(workspace, prose);
    const [claim] = propositions;
    if (claim === undefined) throw new Error("no proposition");
    const fact = upsert({
      type: "fact",
      id: "FACT-quota-call-cap",
      properties: {
        title: "Call cap per window",
        status: "active",
        fact_kind: "property_value",
        subject_key: "client.call_quota",
        property_key: "call_cap",
        operator: "lte",
        value_type: "int",
        value_int: 500,
        claim_key: claim.claim_key,
        claim_text: claim.claim_text,
      },
    });
    expect(fact.status, JSON.stringify(fact)).toBe("success");
    const result = upsert({
      type: "req",
      id: "REQ-quota-call-cap",
      properties: {
        title: "A client is capped at 500 calls per window",
        status: "open",
        semantic_text: prose,
        semantic_inventory: [{ claim_key: claim.claim_key, status: "modeled" }],
      },
      relationships: [
        {
          type: "requires_property",
          from: "REQ-quota-call-cap",
          to: "FACT-quota-call-cap",
        },
      ],
      implementedBy: [{ sourceFile: "src/quota.ts", symbol: "remainingCalls" }],
    });
    expect(result.status, JSON.stringify(result)).toBe("success");
    expect(quantityNotes(result)).toContainEqual(
      expect.stringContaining(
        "FACT-quota-call-cap (client.call_quota.call_cap = 500) states the same quantity as FACT-quota-ceiling",
      ),
    );
  }, 300_000);
});
