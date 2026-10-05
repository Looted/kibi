// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
import { afterEach, describe, expect, test } from "bun:test";
import {
  createConsumerWorkspace,
  type ConsumerWorkspace,
  type Json,
} from "./workspace.js";
import type { UpsertInput } from "../../src/operations/mutation/types.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";
import { dump as dumpYaml } from "js-yaml";
import { bootstrapPlanHash } from "../../src/operations/bootstrap/types.js";

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});
function planClaims(statements: string[]): Json {
  ws = createConsumerWorkspace("kibi-bootstrap-writes-");
  return (
    ws.json(["plan-bootstrap"], {
      bootstrapContext: {
        projectSummary: "Report exports with explicit product constraints.",
        verificationAnchors: ["bun test"],
        knowledgeSources: [
          {
            id: "spec",
            title: "Product spec",
            kind: "specification",
            locator: "https://example.com/spec",
            authority: "authoritative",
          },
        ],
        intentClaims: statements.map((statement, index) => ({
          statement,
          sourceId: "spec",
          reference: `claim:${index + 1}`,
        })),
      },
    }).data as Json
  ).plan as Json;
}

describe("bootstrap writes through the real CLI and Prolog engine", () => {
  test("require, forbid, retention and boolean claims apply and unparseable claims stay follow-ups", () => {
    const plan = planClaims([
      "Users must be able to export reports as CSV.",
      "Refunds must not exceed the original charge.",
      "Logs must be retained for 7 days.",
      "Telemetry must be disabled.",
      "People like reports.",
    ]);
    expect(plan.status).toBe("ready");
    const actions = plan.actions as { payload: UpsertInput }[];
    for (const action of actions)
      expect(() =>
        validateUpsertInput(action.payload, new Date()),
      ).not.toThrow();
    const applied = ws!.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
    });
    expect(applied.status).toBe("success");
    expect((applied.data as Json).outcome).toBe("applied");
    expect((applied.data as Json).changedEntities).toBe(12);
    ws!.sync();
    const check = ws!.json(["check"], {
      rules: ["strict-fact-shape", "domain-contradictions", "no-dangling-refs"],
    });
    expect((check.data as Json).violations).toEqual([]);
    const status = ws!.json(["status"], {});
    expect(status.status).toBe("success");
    expect((status.data as Json).syncState).toBe("fresh");
  }, 120_000);

  test("model-requirement returns writable and applicable polarity claims", () => {
    ws = createConsumerWorkspace("kibi-model-writes-");
    const result = ws.json(["model-requirement"], {
      text: "Users must be able to export reports as CSV.",
      source: "product-spec",
    });
    const steps = (result.data as Json).applyPlan as UpsertInput[];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(() => validateUpsertInput(step, new Date())).not.toThrow();
      expect(ws.json(["upsert"], step as unknown as Json).status).toBe(
        "success",
      );
    }
  }, 120_000);

  test("tampered valid-hash plans are refused before journal creation", () => {
    const original = planClaims(["Telemetry must be disabled."]);
    const actions = original.actions as { payload: UpsertInput }[];
    const broken = {
      ...original,
      actions: actions.map((action, index) =>
        index === 1
          ? {
              ...action,
              payload: {
                ...action.payload,
                properties: {
                  ...action.payload.properties,
                  value_bool: undefined,
                },
              },
            }
          : action,
      ),
    };
    const serializable = JSON.parse(JSON.stringify(broken));
    const plan = { ...serializable, planHash: bootstrapPlanHash(serializable) };
    const result = ws!.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
    });
    expect(result.status).toBe("error");
    expect(result.error).toMatchObject({
      code: "BOOTSTRAP_PLAN_INVALID",
      retryable: false,
    });
    expect(ws!.json(["query"], { type: "fact" }).data).toMatchObject({
      entities: [],
    });
  }, 120_000);
});

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
test("require and forbid on one property are detected as a polarity contradiction", () => {
  const plan = planClaims([
    "Exports must include headers.",
    "Exports must not include headers.",
  ]);
  const applied = ws!.json(["apply-plan"], {
    plan,
    approvedPlanHash: plan.planHash,
  });
  expect(applied.status).toBe("error");
  expect((applied.data as Json).outcome).toBe("rejected");
  expect(JSON.stringify(applied)).toContain("Polarity conflict");
  const status = ws!.json(["status"], {});
  expect(
    ((status.data as Json).bootstrap as Json).incompleteApplications,
  ).toContainEqual(
    expect.objectContaining({
      state: "rejected",
      appliedActions: 5,
      nextOperation: "kb_plan_bootstrap",
    }),
  );
  // The writer correctly refuses a contradictory requirement. Compile the
  // complete authored-source fixture to exercise the checker's witness too.
  const requirement = (plan.actions as { payload: UpsertInput }[])
    .map((row) => row.payload)
    .filter((row) => row.type === "req")
    .at(-1)!;
  const edges = {
    links: (requirement.relationships ?? []).map((edge) => ({
      type: edge.type,
      target: edge.to,
    })),
  };
  ws!.write(
    `.kb/requirements/${requirement.id}.md`,
    `---\n${dumpYaml({ id: requirement.id, type: "req", ...requirement.properties, ...edges })}---\n`,
  );
  ws!.sync();
  const check = ws!.json(["check"], { rules: ["domain-contradictions"] });

  expect((check.data as Json).violations).not.toEqual([]);
}, 120_000);

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
test("schema 6 polarity-only facts migrate strictly without changing IDs or bodies", () => {
  ws = createConsumerWorkspace("kibi-polarity-migration-");
  const manifest = JSON.parse(ws.read(".kb/manifest.json"));
  ws.write(
    ".kb/manifest.json",
    JSON.stringify({ ...manifest, schemaVersion: 6 }),
  );
  const body = "\n# Original body\n\nKeep **these bytes** and the citation.\n";
  for (const polarity of ["require", "forbid"])
    ws.write(
      `.kb/facts/FACT-${polarity}.md`,
      `---\nid: FACT-${polarity}\ntype: fact\ntitle: Legacy ${polarity}\nstatus: active\nfact_kind: property_value\nsubject_key: exports\nproperty_key: headers\npolarity: ${polarity}\n---${body}`,
    );
  ws.stage();
  const before = ws.kibi(["sync"]);
  expect(before.status).toBe(1);
  expect(before.stderr).toContain("missing value field");
  ws.text(["migrate", "--yes"]);
  ws.sync();
  expect(JSON.parse(ws.read(".kb/manifest.json")).schemaVersion).toBe(7);
  for (const polarity of ["require", "forbid"]) {
    const source = ws.read(`.kb/facts/FACT-${polarity}.md`);
    expect(source.endsWith(`---${body}`)).toBe(true);
    expect(source).toContain("value_bool: true");
    const entity = (
      (ws.json(["query"], { id: `FACT-${polarity}` }).data as Json)
        .entities as Json[]
    )[0]!;
    expect(entity).toMatchObject({
      id: `FACT-${polarity}`,
      polarity,
      operator: "eq",
      value_type: "bool",
      value_bool: true,
    });
  }
  expect(
    (ws.json(["check"], { rules: ["strict-fact-shape"] }).data as Json).count,
  ).toBe(0);
  const first = ws.read(".kb/facts/FACT-require.md");
  ws.text(["migrate", "--yes"]);
  expect(ws.read(".kb/facts/FACT-require.md")).toBe(first);
}, 120_000);
