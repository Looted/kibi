import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  type VerificationReport,
  checkCertificatesCommand,
  recheckCertificates,
  renderVerification,
  writeCertificates,
} from "../../src/commands/check-certificates.js";
import * as prologJson from "../../src/public/operations/prolog-json.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
let root: string;
let queries: unknown[][] = [];
let events: unknown[][] = [];
let out: string[] = [];
const prolog = { query: async () => ({ success: true, bindings: {} }) };

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

function answer(value: unknown) {
  track(
    spyOn(prologJson, "runOperationJsonQuery").mockImplementation((async (
      ...args: unknown[]
    ) => {
      queries.push(args);
      return value;
    }) as never),
  );
}

beforeEach(() => {
  root = createTempDir("kibi-cert-mut-");
  queries = [];
  events = [];
  out = [];
  track(
    spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
      out.push(chunk);
      return true;
    }) as never),
  );
  track(
    spyOn(cliRuntime, "createCliRuntime").mockImplementation((() => ({
      open: async (
        spec: { execute: () => Promise<unknown> },
        opts: unknown,
      ) => {
        expect(await spec.execute()).toBeUndefined();
        events.push(["open", { ...spec, execute: "fn" }, opts]);
        return { prolog };
      },
      close: async (_context: unknown, outcome: unknown) => {
        events.push(["close", outcome]);
      },
    })) as never),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  removeTempDir(root);
});

const base: VerificationReport = {
  version: "v",
  status: "verified",
  certificates: 2,
  verified: 2,
  rejected: [],
  theorems: [],
  notCovered: [],
};

const opened = [
  "open",
  {
    name: "kibi_check_certificates",
    effects: [],
    requiresProlog: true,
    execute: "fn",
  },
  {},
];

describe("renderVerification", () => {
  test("labels every theorem and the uncovered checks", () => {
    expect(
      renderVerification({
        ...base,
        theorems: [
          {
            theorem: "properties_consistent",
            verdict: "proved",
            groups: 2,
            models: 2,
          },
          { theorem: "predicates_consistent", verdict: "proved", groups: 1 },
          { theorem: "decisions_consistent", verdict: "proved" },
          { theorem: "rules_stratified", verdict: "proved" },
          { theorem: "custom", verdict: "unresolved", groups: 0 },
        ],
        notCovered: ["rule_conflicts", "scenario_feasibility", "other"],
      }),
    ).toBe(
      [
        "Kibi certificates: all 2 re-verified",
        "",
        "- Property facts are consistent: proved (2 of 2 groups have a model)",
        "- Predicate facts are consistent: proved (0 of 1 groups have a model)",
        "- Allow/deny decisions are consistent: proved (no facts of this kind)",
        "- Stored rules are stratified: proved (0 predicates, 0 dependencies)",
        "- custom: unresolved (no facts of this kind)",
        "",
        "Not certified yet: opposing rule pairs (kibi check domain-contradictions); scenario feasibility (kibi check scenario-feasibility); other",
        "",
      ].join("\n"),
    );
  });

  test("describes each kind of contradiction and rejection", () => {
    expect(
      renderVerification({
        ...base,
        status: "rejected",
        verified: 1,
        theorems: [
          {
            theorem: "properties_consistent",
            verdict: "disproved",
            groups: 1,
            models: 0,
            contradictions: [
              {
                subjectKey: "s",
                propertyKey: "p",
                scope: "x",
                reason: "clash",
              },
              { subjectKey: "s", propertyKey: 3, scope: "" },
              { subjectKey: "s", propertyKey: "q", scope: 4, reason: 5 },
              { name: "n", namespace: "ns", args: [1, "b"], reason: "why" },
              { name: "n", namespace: "ns", key: ["k"] },
              { name: "n", namespace: "ns", args: "no", key: "no", reason: 1 },
              { other: true },
              null,
              "text",
              7,
            ],
            unresolved: [{ subjectKey: "u", propertyKey: "v" }],
          },
        ],
        rejected: [
          { certificate: 2, kind: "model", reason: "bad model" },
          { certificate: 0, kind: "group-kind", reason: "no group" },
          {
            certificate: 0,
            kind: "k",
            reason: "grouped",
            group: { subjectKey: "g", propertyKey: "h" },
          },
        ],
      }),
    ).toBe(
      [
        "Kibi certificates: 3 problem(s); 1 of 2 certificates re-verified",
        "",
        "- Property facts are consistent: disproved (0 of 1 groups have a model)",
        "    contradiction: s.p (scope x): clash",
        "    contradiction: s.3",
        "    contradiction: s.q",
        "    contradiction: ns:n(1, b): why",
        "    contradiction: ns:n(k)",
        "    contradiction: ns:n()",
        '    contradiction: {"other":true}',
        "    contradiction: null",
        "    contradiction: text",
        "    contradiction: 7",
        "    unresolved: u.v",
        "",
        "Rejected:",
        "- certificate 2 (model): bad model",
        "- group-kind: no group",
        "- g.h: grouped",
        "",
      ].join("\n"),
    );
  });
});

describe("recheckCertificates", () => {
  test("asks the engine to verify the resolved bundle path", async () => {
    const file = path.join(root, "it's\\bundle.json");
    writeFileSync(file, "{}");
    answer(base);
    expect(
      await recheckCertificates(file, {
        prolog,
      } as unknown as OperationContext),
    ).toBe(base);
    expect(queries).toStrictEqual([
      [
        prolog,
        "certificate_check.pl",
        `certificate_check:kb_verify_certificates_file('${path.resolve(file).replaceAll("\\", "/").replaceAll("'", "''")}', JsonString)`,
        "Certificate verification",
      ],
    ]);
  });

  test("refuses a missing or invalid bundle before asking", async () => {
    answer(base);
    const missing = path.join(root, "missing.json");
    await expect(
      recheckCertificates(missing, { prolog } as unknown as OperationContext),
    ).rejects.toThrow(new Error(`check: no certificate bundle at ${missing}`));
    const invalid = path.join(root, "invalid.json");
    writeFileSync(invalid, "{");
    await expect(
      recheckCertificates(invalid, { prolog } as unknown as OperationContext),
    ).rejects.toThrow(new Error(`check: ${invalid} is not valid JSON`));
    await expect(
      recheckCertificates(invalid, {} as OperationContext),
    ).rejects.toThrow(new Error(`check: ${invalid} is not valid JSON`));
    expect(queries).toStrictEqual([]);
  });
});

describe("checkCertificatesCommand", () => {
  test("prints the report on an engine and exits by its verdict", async () => {
    const file = path.join(root, "b.json");
    writeFileSync(file, "{}");
    answer({ ...base, status: "rejected" });
    expect(
      await checkCertificatesCommand({ certificates: file, json: true }),
    ).toStrictEqual({ exitCode: 1 });
    expect(out).toStrictEqual([
      `${JSON.stringify({ ...base, status: "rejected" }, null, 2)}\n`,
    ]);
    expect(events).toStrictEqual([
      opened,
      ["close", { status: "success", result: 0 }],
    ]);
  });

  test("closes with an error without a Prolog engine", async () => {
    const file = path.join(root, "b.json");
    writeFileSync(file, "{}");
    track(
      spyOn(cliRuntime, "createCliRuntime").mockImplementation((() => ({
        open: async () => ({}),
        close: async (_context: unknown, outcome: unknown) => {
          events.push(["close", outcome]);
        },
      })) as never),
    );
    await expect(
      checkCertificatesCommand({ certificates: file }),
    ).rejects.toThrow(new Error("check: the Kibi engine is not available"));
    expect(events).toStrictEqual([["close", { status: "error", error: 1 }]]);
  });
});

describe("writeCertificates", () => {
  test("asks the engine to write the bundle at the resolved path", async () => {
    answer({ path: "/x", certificates: 4 });
    expect(await writeCertificates("out\\c.json")).toStrictEqual({
      path: "/x",
      certificates: 4,
    });
    expect(queries).toStrictEqual([
      [
        prolog,
        "certificates.pl",
        `certificates:kb_write_certificates('${path.resolve("out\\c.json").replaceAll("\\", "/")}', JsonString)`,
        "Certificate generation",
      ],
    ]);
    expect(events).toStrictEqual([
      opened,
      ["close", { status: "success", result: 0 }],
    ]);
  });
});
