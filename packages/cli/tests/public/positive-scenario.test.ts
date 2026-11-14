import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyPositiveScenarioAcknowledgement,
  mergePositiveScenarioAcknowledgements,
  planPositiveScenarioAcknowledgements,
} from "../../src/operations/migration/positive-scenario.js";
import {
  POSITIVE_SCENARIO_RULE,
  POSITIVE_SCENARIO_SCHEMA_VERSION,
  type PositiveScenarioGap,
  collectPositiveScenarioViolations,
  isMustPriority,
  planPositiveScenarioAcknowledgement,
  positiveScenarioViolations,
  readPositiveScenarioGaps,
} from "../../src/public/operations/positive-scenario.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import { readKbManifest } from "../../src/utils/kb-manifest.js";

const RULES = new Set([POSITIVE_SCENARIO_RULE]);

const gap = (
  id: string,
  reason: PositiveScenarioGap["reason"],
  extra: Partial<PositiveScenarioGap> = {},
): PositiveScenarioGap => ({
  id,
  reason,
  subjects: ["client.call_quota"],
  successScenarios: [],
  ...extra,
});

describe("must-positive-scenario findings", () => {
  test("constants", () => {
    expect(POSITIVE_SCENARIO_SCHEMA_VERSION).toBe(17);
    expect(POSITIVE_SCENARIO_RULE).toBe("must-positive-scenario");
  });

  test("each reason names what is missing and how to add it", () => {
    const [none, missing, unassumed] = positiveScenarioViolations(
      [
        gap("REQ-A", "no_subjects", { subjects: [] }),
        gap("REQ-B", "no_success_scenario"),
        gap("REQ-C", "no_subject_assumption", {
          successScenarios: ["SCEN-C"],
        }),
      ],
      new Set(),
    );
    expect(none).toMatchObject({
      rule: POSITIVE_SCENARIO_RULE,
      entityId: "REQ-A",
      evidence: { reason: "no_subjects", subjects: [], successScenarios: [] },
    });
    expect(none?.description).toBe(
      "Must requirement REQ-A is about no subject, so no scenario can state the behaviour it promises in terms other requirements share",
    );
    expect(none?.suggestion).toStartWith(
      "Name the subjects REQ-A is about (link a subject fact through constrains",
    );
    expect(missing?.description).toBe(
      "Must requirement REQ-B has no scenario that expects success, so nothing states the behaviour it promises on client.call_quota",
    );
    expect(missing?.suggestion).toStartWith(
      "Add a scenario with expects: success that specifies REQ-B (specified_by)",
    );
    expect(unassumed?.description).toBe(
      "Must requirement REQ-C has success scenarios (SCEN-C), but none assumes a property_value, predicate or rule fact on its subjects (client.call_quota), so its positive behaviour cannot be compared with other requirements",
    );
    expect(unassumed?.suggestion).toContain(
      "Link at least one of those scenarios",
    );
    expect(unassumed?.suggestion).toContain(
      "assuming the subject fact itself does not count",
    );
  });

  test("an undefined subject is defined first", () => {
    const [undefinedSubject] = positiveScenarioViolations(
      [gap("REQ-D", "undefined_subjects", { subjects: ["text.nothing"] })],
      new Set(),
    );
    expect(undefinedSubject?.description).toBe(
      "Must requirement REQ-D names only subjects no active subject fact defines (text.nothing), so no scenario can state the behaviour it promises on them yet",
    );
    expect(undefinedSubject?.suggestion).toStartWith(
      "Define the subject first (claim-subject-undefined): a subject fact for text.nothing",
    );
  });

  test("long lists are cut after eight", () => {
    const subjects = Array.from({ length: 10 }, (_, index) => `s.k${index}`);
    const [finding] = positiveScenarioViolations(
      [gap("REQ-A", "no_success_scenario", { subjects })],
      new Set(),
    );
    expect(finding?.description).toEndWith(
      "on s.k0, s.k1, s.k2, s.k3, s.k4, s.k5, s.k6, s.k7 (+2 more)",
    );
  });

  test("requirements the upgrade recorded stay exempt", () => {
    const gaps = [
      gap("REQ-OLD", "no_success_scenario"),
      gap("REQ-NEW", "no_success_scenario"),
    ];
    expect(
      positiveScenarioViolations(gaps, new Set(["REQ-OLD"])).map(
        (finding) => finding.entityId,
      ),
    ).toEqual(["REQ-NEW"]);
  });

  test("a must priority is read as the coverage rule reads it", () => {
    expect(isMustPriority("must")).toBe(true);
    expect(isMustPriority(" P0-must ")).toBe(true);
    expect(isMustPriority("should")).toBe(false);
    expect(isMustPriority(undefined)).toBe(false);
  });
});

describe("collectPositiveScenarioViolations", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-positive-scenario-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function manifest(schemaVersion: number, acknowledged?: string[]): void {
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb/manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion,
        semanticAdvisorBackfill: "not_applicable",
        ...(acknowledged === undefined
          ? {}
          : { positiveScenarioAcknowledged: acknowledged }),
      }),
    );
  }

  function context(rows: unknown, withProlog = true): OperationContext {
    const prolog = {
      oneShotMode: true,
      query: async (goal: string) => {
        expect(goal).toContain(
          "domain_subjects:positive_scenario_gaps_json(JsonString)",
        );
        return {
          success: true,
          bindings: { JsonString: JSON.stringify(rows) },
        };
      },
    } as unknown as PrologPort;
    return {
      workspaceRoot: root,
      signal: new AbortController().signal,
      clock: () => new Date(0),
      ...(withProlog ? { prolog } : {}),
    } as OperationContext;
  }

  const payload = {
    evaluated: 2,
    rows: [gap("REQ-OLD", "no_subjects"), gap("REQ-NEW", "no_subjects")],
  };

  test("judges the store from schema 17, exempting recorded requirements", async () => {
    manifest(17, ["REQ-OLD"]);
    const findings = await collectPositiveScenarioViolations(
      context(payload),
      RULES,
    );
    expect(findings.map((finding) => finding.entityId)).toEqual(["REQ-NEW"]);
    manifest(17);
    expect(
      (
        await collectPositiveScenarioViolations(
          context({ evaluated: 0 }),
          RULES,
        )
      ).length,
    ).toBe(0);
    expect(
      (await collectPositiveScenarioViolations(context(payload), RULES)).map(
        (finding) => finding.entityId,
      ),
    ).toEqual(["REQ-OLD", "REQ-NEW"]);
  });

  test("skips an older schema, a missing manifest, other rules and no store", async () => {
    expect(
      await collectPositiveScenarioViolations(context(payload), RULES),
    ).toEqual([]);
    manifest(16);
    expect(
      await collectPositiveScenarioViolations(context(payload), RULES),
    ).toEqual([]);
    manifest(17);
    expect(
      await collectPositiveScenarioViolations(
        context(payload),
        new Set(["other"]),
      ),
    ).toEqual([]);
    expect(
      await collectPositiveScenarioViolations(context(payload, false), RULES),
    ).toEqual([]);
  });

  test("reads the gaps through an engine started on demand", async () => {
    const started = context(payload);
    const lazy = {
      ...context(payload, false),
      ensureProlog: async () => started.prolog as PrologPort,
    } as OperationContext;
    expect((await readPositiveScenarioGaps(lazy)).evaluated).toBe(2);
    expect(await readPositiveScenarioGaps(context(payload, false))).toEqual({});
  });
});

describe("schema 17 acknowledgement", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-positive-ack-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(relative: string, content: string): void {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  function requirement(id: string, extra: string): void {
    write(
      `.kb/requirements/${id}.md`,
      `---\nid: ${id}\ntype: req\ntitle: ${id}\n${extra}\n---\n\nBody.\n`,
    );
  }

  test("records every current must requirement, and only once", () => {
    requirement("REQ-MUST", "status: open\npriority: must");
    requirement("REQ-SHOULD", "status: open\npriority: should");
    requirement("REQ-RETIRED", "status: retired\npriority: must");
    requirement("REQ-OLD", "status: open\npriority: must");
    requirement(
      "REQ-NEWER",
      "status: open\npriority: must\nlinks:\n  - type: supersedes\n    target: REQ-OLD",
    );
    expect(planPositiveScenarioAcknowledgement(root)).toEqual([
      "REQ-MUST",
      "REQ-NEWER",
    ]);
    expect(() => applyPositiveScenarioAcknowledgement(root)).toThrow(
      "Cannot acknowledge existing must requirements without .kb/manifest.json",
    );
    write(
      ".kb/manifest.json",
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 16,
        semanticAdvisorBackfill: "not_applicable",
        positiveScenarioAcknowledged: ["REQ-MUST"],
      }),
    );
    expect(planPositiveScenarioAcknowledgements(root)).toEqual(["REQ-NEWER"]);
    expect(applyPositiveScenarioAcknowledgement(root)).toBe(1);
    expect(readKbManifest(root)?.positiveScenarioAcknowledged).toEqual([
      "REQ-MUST",
      "REQ-NEWER",
    ]);
    expect(applyPositiveScenarioAcknowledgement(root)).toBe(0);
    expect(
      mergePositiveScenarioAcknowledgements(undefined, ["B", "A", "B"]),
    ).toEqual(["A", "B"]);
  });
});
