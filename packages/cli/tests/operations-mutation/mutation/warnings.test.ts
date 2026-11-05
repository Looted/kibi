import { describe, expect, test } from "bun:test";
import {
  scenarioCoverageWarning,
  scenarioCoverageWarnings,
  symbolCoverageWarning,
  symbolCoverageWarnings,
} from "../../../src/operations/mutation/warnings.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";

const SCENARIO = (id: string) =>
  `Scenario-backed coverage: verified_by(${id},test) is valid but will not satisfy symbol-coverage because ${id} has specified_by a scenario. Use verified_by(scenario,test) or validates(test,scenario) instead.`;
const SYMBOL = (id: string) =>
  `Production symbol ${id} has implements but no covered_by: kb_check will report symbol-coverage. Add covered_by: TEST-<area>-<behavior> to a test that validates the requirement's scenario (or verified_by(req,test) when the requirement has no scenario).`;

describe("scenarioCoverageWarnings", () => {
  test("warns when a verified_by requirement has a stored scenario", async () => {
    const fake = scriptedProlog([ok()]);
    expect(
      await scenarioCoverageWarnings(
        fake.prolog,
        [
          { type: "implements", from: "R'1", to: "X" },
          { type: "verified_by", from: "R'1", to: "T" },
        ],
        "req",
        "R'1",
      ),
    ).toStrictEqual([SCENARIO("R'1")]);
    expect(fake.goals).toStrictEqual([
      "once(kb_relationship(specified_by, 'R''1', ScenarioId))",
    ]);
    expect(scenarioCoverageWarning("REQ-9")).toStrictEqual([SCENARIO("REQ-9")]);
  });

  test("checks each verified_by edge until one is backed", async () => {
    const fake = scriptedProlog([fail(), ok()]);
    expect(
      await scenarioCoverageWarnings(
        fake.prolog,
        [
          { type: "verified_by", from: "R", to: "T1" },
          { type: "verified_by", from: "R", to: "T2" },
        ],
        "req",
        "R",
      ),
    ).toStrictEqual([SCENARIO("R")]);
    expect(fake.goals).toHaveLength(2);
  });

  test("stays silent without a scenario, verified_by edge or requirement", async () => {
    const none = scriptedProlog([fail()]);
    expect(
      await scenarioCoverageWarnings(
        none.prolog,
        [{ type: "verified_by", from: "R", to: "T" }],
        "req",
        "R",
      ),
    ).toStrictEqual([]);
    const noEdge = scriptedProlog([ok()]);
    expect(
      await scenarioCoverageWarnings(
        noEdge.prolog,
        [{ type: "implements", from: "R", to: "T" }],
        "req",
        "R",
      ),
    ).toStrictEqual([]);
    expect(noEdge.goals).toStrictEqual([]);
    const other = scriptedProlog([ok()]);
    expect(
      await scenarioCoverageWarnings(
        other.prolog,
        [{ type: "verified_by", from: "R", to: "T" }],
        "symbol",
        "R",
      ),
    ).toStrictEqual([]);
    expect(other.goals).toStrictEqual([]);
  });
});

describe("symbolCoverageWarnings", () => {
  const implementsOnly = [
    { type: "implements", from: "SYM-a", to: "REQ-a" },
    { type: "relates_to", from: "SYM-a", to: "REQ-b" },
  ];

  test("warns for a production symbol with no stored coverage", async () => {
    const fake = scriptedProlog([fail()]);
    expect(
      await symbolCoverageWarnings(
        fake.prolog,
        implementsOnly,
        "symbol",
        "SYM-a",
      ),
    ).toStrictEqual([SYMBOL("SYM-a")]);
    expect(fake.goals).toStrictEqual([
      "once((kb_relationship(covered_by, 'SYM-a', _) ; kb_relationship(executable_for, 'SYM-a', _)))",
    ]);
    expect(symbolCoverageWarning("S")).toStrictEqual([SYMBOL("S")]);
  });

  test("treats an edge without from as the symbol's own", async () => {
    const fake = scriptedProlog([fail()]);
    expect(
      await symbolCoverageWarnings(
        fake.prolog,
        [{ type: "implements", to: "REQ-a" }] as never,
        "symbol",
        "SYM-'b",
      ),
    ).toStrictEqual([SYMBOL("SYM-'b")]);
    expect(fake.goals[0]).toContain("'SYM-''b'");
  });

  test("is silent when stored coverage exists", async () => {
    expect(
      await symbolCoverageWarnings(
        scriptedProlog([ok()]).prolog,
        implementsOnly,
        "symbol",
        "SYM-a",
      ),
    ).toStrictEqual([]);
  });

  test("skips the query for non-production or other-owned edges", async () => {
    const cases: Array<[string, Array<Record<string, string>>]> = [
      ["symbol", []],
      ["symbol", [{ type: "implements", from: "SYM-other", to: "REQ-a" }]],
      [
        "symbol",
        [
          ...implementsOnly,
          { type: "covered_by", from: "SYM-a", to: "TEST-a" },
        ],
      ],
      [
        "symbol",
        [
          ...implementsOnly,
          { type: "executable_for", from: "SYM-a", to: "TEST-a" },
        ],
      ],
      ["req", implementsOnly],
    ];
    for (const [type, relationships] of cases) {
      const fake = scriptedProlog([fail()]);
      expect(
        await symbolCoverageWarnings(
          fake.prolog,
          relationships as never,
          type,
          "SYM-a",
        ),
      ).toStrictEqual([]);
      expect(fake.goals).toStrictEqual([]);
    }
  });
});
