import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  EVIDENCE_FLOOR_PIN_CODE,
  type LadderFloorVerdicts,
  applyEvidenceFloorPins,
  planEvidenceFloorPins,
  readLadderFloorVerdicts,
} from "../../../src/operations/migration/evidence-floor.js";
import * as evidenceFloor from "../../../src/public/operations/evidence-floor.js";
import * as runtimeTypes from "../../../src/public/operations/runtime-types.js";
import * as shards from "../../../src/relationships/shards.js";
import * as cliRuntime from "../../../src/runtime/cli-runtime.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

type Shard = ReturnType<typeof shards.readAllShards>;

const doc = (frontmatter: string) => `---\n${frontmatter}---\nBody.\n`;
const links = (pairs: [string, string][]) =>
  pairs.length === 0
    ? ""
    : `links:\n${pairs.map(([type, target]) => `  - type: ${type}\n    target: ${target}\n`).join("")}`;
const req = (id: string, extra = "") =>
  doc(`id: ${id}\ntitle: ${id}\ntype: req\n${extra}`);
const passing = (extra = "") =>
  `proof_contract:\n  kind: rule\nverification_scope: end_to_end\nproof_receipts:\n  - finished_at: '2026-01-01'\n    outcome: passed\n${extra}`;

function plan(
  files: Record<string, string>,
  ladder?: LadderFloorVerdicts | null,
  records: Shard | Error = [],
) {
  const root = tempWorkspace(files);
  const spy = spyOn(shards, "readAllShards").mockImplementation(() => {
    if (records instanceof Error) throw records;
    return records;
  });
  try {
    return { root, plan: planEvidenceFloorPins(root, ladder) };
  } finally {
    spy.mockRestore();
  }
}

const pinnedIds = (files: Record<string, string>, records: Shard = []) =>
  plan(files, undefined, records).plan.targets.map((target) => target.id);

/** A requirement with a scenario verified by a test carrying `test`. */
function chain(test: string): Record<string, string> {
  return {
    ".kb/requirements/R.md": req("REQ-r", links([["specified_by", "SCN-s"]])),
    ".kb/scenarios/S.md": doc(
      `id: SCN-s\ntitle: S\n${links([["verified_by", "TEST-t"]])}`,
    ),
    ".kb/tests/T.md": doc(`id: TEST-t\ntitle: T\n${test}`),
  };
}

describe("planEvidenceFloorPins", () => {
  test("pins current firm requirements without a proof path", () => {
    const files = {
      ".kb/requirements/A.md": req("REQ-a"),
      ".kb/requirements/B.md": req("REQ-b", "required_evidence: tested\n"),
      ".kb/requirements/C.md": req("REQ-c", "proof_exempt: true\n"),
      ".kb/requirements/D.md": req("REQ-d", "proof_exempt: 'true'\n"),
      ".kb/requirements/E.md": req("REQ-e", "status: deprecated\n"),
      ".kb/requirements/F.md": req("REQ-f", "firmness: default\n"),
      ".kb/requirements/G.md": req("REQ-g", "required_evidence:\n  tested\n"),
      ".kb/requirements/H.md": req("REQ-h", "type: adr\n").replace(
        "type: req\n",
        "",
      ),
      ".kb/requirements/I.md": "no front matter\n",
      ".kb/requirements/J.md": doc("  id: REQ-j\n  title: J\n  type: req\n"),
    };
    const { plan: result } = plan(files);
    expect(result).toStrictEqual({
      targets: [
        {
          id: "REQ-a",
          type: "req",
          path: ".kb/requirements/A.md",
          before: files[".kb/requirements/A.md"],
          after: req("REQ-a", "required_evidence: asserted\n"),
        },
        {
          id: "REQ-d",
          type: "req",
          path: ".kb/requirements/D.md",
          before: files[".kb/requirements/D.md"],
          after: req(
            "REQ-d",
            "proof_exempt: 'true'\nrequired_evidence: asserted\n",
          ),
        },
      ],
      skipped: [
        {
          id: "REQ-j",
          path: ".kb/requirements/J.md",
          reason: "required_evidence could not be edited safely",
        },
      ],
      kept: [],
      decidedBy: "authored",
    });
  });

  test("keeps a requirement whose end-to-end proof passed", () => {
    expect(pinnedIds(chain(passing()))).toStrictEqual([]);
    expect(plan(chain(passing())).plan.kept).toStrictEqual(["REQ-r"]);
  });

  test("pins a requirement whose test cannot reach tested", () => {
    const pinned = (test: string) => pinnedIds(chain(test));
    expect(
      pinned(passing().replace("proof_contract:\n  kind: rule\n", "")),
    ).toStrictEqual(["REQ-r"]);
    expect(pinned(passing().replace("end_to_end", "unit"))).toStrictEqual([
      "REQ-r",
    ]);
    expect(
      pinned(
        "proof_contract: {}\nverification_scope: end_to_end\nproof_receipts: x\n",
      ),
    ).toStrictEqual(["REQ-r"]);
    expect(
      pinned(
        "proof_contract: {}\nverification_scope: end_to_end\nproof_receipts: []\n",
      ),
    ).toStrictEqual(["REQ-r"]);
    expect(
      pinned(
        "proof_contract: {}\nverification_scope: end_to_end\nproof_receipts: [junk, null]\n",
      ),
    ).toStrictEqual(["REQ-r"]);
  });

  test("judges the newest receipt", () => {
    const receipts = (items: string) =>
      pinnedIds(
        chain(
          `proof_contract: {}\nverification_scope: end_to_end\nproof_receipts:\n${items}`,
        ),
      );
    expect(
      receipts(
        "  - {finished_at: '2026-02', outcome: passed}\n  - {finished_at: '2026-01', outcome: failed}\n",
      ),
    ).toStrictEqual([]);
    expect(
      receipts(
        "  - {finished_at: '2026-01', outcome: passed}\n  - {finished_at: '2026-02', outcome: failed}\n",
      ),
    ).toStrictEqual(["REQ-r"]);
    expect(
      receipts(
        "  - {finished_at: '2026-01', outcome: passed}\n  - {finished_at: '2026-01', outcome: failed}\n",
      ),
    ).toStrictEqual(["REQ-r"]);
    expect(
      receipts("  - {outcome: failed}\n  - {outcome: passed}\n"),
    ).toStrictEqual([]);
    expect(receipts("  - {outcome: passed}\n  - junk\n")).toStrictEqual([]);
    expect(
      receipts(
        "  - {finished_at: 5, outcome: failed}\n  - {outcome: passed}\n",
      ),
    ).toStrictEqual([]);
  });

  test("follows links in either direction and from shards", () => {
    const base = {
      ".kb/requirements/R.md": req("REQ-r"),
      ".kb/scenarios/S.md": doc("id: SCN-s\ntitle: S\n"),
      ".kb/tests/T.md": doc(`id: TEST-t\ntitle: T\n${passing()}`),
    };
    expect(
      pinnedIds({
        ...base,
        ".kb/requirements/R.md": req(
          "REQ-r",
          links([["specified_by", "SCN-s"]]),
        ),
        ".kb/tests/T.md": doc(
          `id: TEST-t\ntitle: T\n${passing(links([["validates", "SCN-s"]]))}`,
        ),
      }),
    ).toStrictEqual([]);
    expect(
      pinnedIds(base, [
        { type: "specified_by", from: "REQ-r", to: "SCN-s" },
        { type: "verified_by", from: "SCN-s", to: "TEST-t" },
      ] as Shard),
    ).toStrictEqual([]);
    expect(
      pinnedIds(base, [
        { type: "specified_by", from: "REQ-r", to: "SCN-s" },
        { type: "validates", from: "TEST-t", to: "SCN-s" },
      ] as Shard),
    ).toStrictEqual([]);
    for (const records of [
      [
        { type: "specified_by", from: "REQ-r", to: "SCN-s" },
        { type: "validates", from: "SCN-s", to: "TEST-t" },
      ],
      [
        { type: "specified_by", from: "REQ-r", to: "SCN-s" },
        { type: "relates_to", from: "TEST-t", to: "SCN-s" },
      ],
      [
        { type: "verified_by", from: "REQ-r", to: "SCN-s" },
        { type: "verified_by", from: "SCN-s", to: "TEST-t" },
      ],
      [
        { type: "specified_by", from: "REQ-r", to: "SCN-s" },
        { type: "verified_by", from: "SCN-s", to: "TEST-other" },
      ],
    ])
      expect(pinnedIds(base, records as Shard)).toStrictEqual(["REQ-r"]);
  });

  test("reads only well-formed links of the right type", () => {
    const scenario = (extra: string) =>
      pinnedIds({
        ...chain(passing()),
        ".kb/scenarios/S.md": doc(`id: SCN-s\ntitle: S\n${extra}`),
      });
    expect(
      scenario(
        "links:\n  - null\n  - x\n  - {type: verified_by, target: 5}\n  - {type: verified_by, target: TEST-t}\n",
      ),
    ).toStrictEqual([]);
    expect(
      scenario("links:\n  - null\n  - {type: verified_by, target: 5}\n"),
    ).toStrictEqual(["REQ-r"]);
    expect(scenario("links: x\n")).toStrictEqual(["REQ-r"]);
    expect(scenario("links: {type: verified_by}\n")).toStrictEqual(["REQ-r"]);
    expect(scenario(links([["validates", "TEST-t"]]))).toStrictEqual(["REQ-r"]);
  });

  test("lets several scenarios and tests share entities", () => {
    expect(
      pinnedIds({
        ".kb/requirements/R.md": req(
          "REQ-r",
          links([
            ["specified_by", "SCN-a"],
            ["specified_by", "SCN-b"],
          ]),
        ),
        ".kb/requirements/Q.md": req(
          "REQ-q",
          links([["specified_by", "SCN-b"]]),
        ),
        ".kb/scenarios/A.md": doc(
          `id: SCN-a\ntitle: A\n${links([["verified_by", "TEST-x"]])}`,
        ),
        ".kb/scenarios/B.md": doc(
          `id: SCN-b\ntitle: B\n${links([
            ["verified_by", "TEST-y"],
            ["verified_by", "TEST-t"],
          ])}`,
        ),
        ".kb/tests/T.md": doc(`id: TEST-t\ntitle: T\n${passing()}`),
      }),
    ).toStrictEqual([]);
  });

  test("matches link targets that are strings only", () => {
    expect(
      pinnedIds({
        ".kb/requirements/R.md": req(
          "REQ-r",
          "links:\n  - {type: specified_by, target: 5}\n",
        ),
        ".kb/tests/T.md": doc(
          `id: TEST-t\ntitle: T\n${passing("links:\n  - {type: validates, target: 5}\n")}`,
        ),
      }),
    ).toStrictEqual(["REQ-r"]);
  });

  test("orders receipts without finish times by history", () => {
    const failed = Array.from(
      { length: 10 },
      () => "  - {outcome: failed}\n",
    ).join("");
    expect(
      pinnedIds(
        chain(
          `proof_contract: {}\nverification_scope: end_to_end\nproof_receipts:\n${failed}  - {outcome: passed}\n`,
        ),
      ),
    ).toStrictEqual([]);
  });

  test("reads the workspace's shards", () => {
    const root = tempWorkspace({});
    const spy = spyOn(shards, "readAllShards").mockReturnValue([]);
    try {
      planEvidenceFloorPins(root);
      // Supersession and proof paths each read them.
      const kb = path.join(root, ".kb");
      expect(spy.mock.calls).toStrictEqual([[kb], [kb]]);
    } finally {
      spy.mockRestore();
    }
  });

  test("survives malformed shards", () => {
    expect(
      plan(chain(passing()), undefined, new Error("bad")).plan.kept,
    ).toStrictEqual(["REQ-r"]);
  });

  test("lets the ladder pin a requirement below the tested floor", () => {
    const below: LadderFloorVerdicts = new Map([["REQ-r", "below"]]);
    const pending: LadderFloorVerdicts = new Map([
      ["REQ-r", "pending_reproof"],
    ]);
    expect(plan(chain(passing()), below).plan).toMatchObject({
      kept: [],
      decidedBy: "ladder",
    });
    expect(plan(chain(passing()), pending).plan).toMatchObject({
      kept: ["REQ-r"],
      decidedBy: "ladder",
    });
    expect(plan(chain(passing()), null).plan.decidedBy).toBe("authored");
    expect(plan({}, new Map()).plan.decidedBy).toBe("ladder");
  });
});

describe("applyEvidenceFloorPins", () => {
  test("writes the planned floors", () => {
    expect(EVIDENCE_FLOOR_PIN_CODE).toBe("evidence_floor_pin");
    const root = tempWorkspace({
      ".kb/requirements/A.md": req("REQ-a"),
      ".kb/requirements/B.md": req("REQ-b", "firmness: default\n"),
    });
    const spy = spyOn(shards, "readAllShards").mockReturnValue([]);
    try {
      expect(applyEvidenceFloorPins(root)).toBe(1);
      expect(applyEvidenceFloorPins(root, new Map())).toBe(0);
    } finally {
      spy.mockRestore();
    }
    expect(readFileSync(path.join(root, ".kb/requirements/A.md"), "utf8")).toBe(
      req("REQ-a", "required_evidence: asserted\n"),
    );
    expect(readFileSync(path.join(root, ".kb/requirements/B.md"), "utf8")).toBe(
      req("REQ-b", "firmness: default\n"),
    );
  });
});

describe("readLadderFloorVerdicts", () => {
  const HEALTHY = {
    branchStore: { state: "healthy" },
    snapshotId: "s1",
    branchAttachment: { kind: "exact" },
  };
  const realExecute = runtimeTypes.executeOperation;

  async function read(options: {
    status?: unknown;
    rows?: unknown;
    fail?: boolean;
  }) {
    const calls: unknown[][] = [];
    const context = { marker: "context" };
    const runtime = {
      open: async () => context,
      afterSuccess: async () => {
        calls.push(["afterSuccess"]);
      },
      close: async () => {},
    };
    const create = spyOn(cliRuntime, "createCliRuntime").mockImplementation(((
      runtimeOptions: unknown,
    ) => {
      calls.push(["createCliRuntime", runtimeOptions]);
      return runtime;
    }) as unknown as typeof cliRuntime.createCliRuntime);
    const execute = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async (rt: unknown, spec: { name: string }, input: unknown) => {
        if (spec.name === "kb_status") {
          calls.push(["status", rt === runtime, input]);
          if (options.fail) throw new Error("status failed");
          return { content: [], structuredContent: options.status };
        }
        calls.push(["operation", spec, input]);
        return realExecute(
          rt as runtimeTypes.OperationRuntime,
          spec as Parameters<typeof realExecute>[1],
          input,
        );
      }) as unknown as typeof runtimeTypes.executeOperation,
    );
    const rows = spyOn(
      evidenceFloor,
      "readEvidenceFloorRows",
    ).mockImplementation((async (...args: unknown[]) => {
      calls.push(["rows", args.length, args[0] === context]);
      return options.rows;
    }) as unknown as typeof evidenceFloor.readEvidenceFloorRows);
    try {
      return { result: await readLadderFloorVerdicts("/ws"), calls };
    } finally {
      create.mockRestore();
      execute.mockRestore();
      rows.mockRestore();
    }
  }

  test("maps tested-floor rows to their verdicts", async () => {
    const { result, calls } = await read({
      status: HEALTHY,
      rows: [
        { id: "REQ-a", requiredEvidence: "tested", status: "below" },
        { id: "REQ-b", requiredEvidence: "asserted", status: "below" },
        { id: "REQ-c", requiredEvidence: "tested", status: "pending_reproof" },
      ],
    });
    expect(result).toStrictEqual(
      new Map([
        ["REQ-a", "below"],
        ["REQ-c", "pending_reproof"],
      ]),
    );
    expect(calls.slice(0, 2)).toStrictEqual([
      ["createCliRuntime", { workspaceRoot: "/ws" }],
      ["status", true, {}],
    ]);
    const [, spec, input] = calls[2] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(input).toStrictEqual({});
    expect(spec.name).toBe("kb_migrate_evidence_floor_preview");
    expect(spec.effects).toStrictEqual(["kb-read"]);
    expect(spec.requiresProlog).toBe(true);
    expect(calls.slice(3)).toStrictEqual([["rows", 1, true]]);
  });

  test("returns null for an unhealthy store or a failed read", async () => {
    for (const status of [
      undefined,
      {},
      { ...HEALTHY, branchStore: { state: "stale" } },
      { ...HEALTHY, snapshotId: "missing" },
      { ...HEALTHY, branchAttachment: { kind: "fallback" } },
    ]) {
      const { result, calls } = await read({ status, rows: [] });
      expect(result).toBeNull();
      expect(calls.some((call) => call[0] === "operation")).toBe(false);
    }
    expect((await read({ fail: true })).result).toBeNull();
    expect((await read({ status: HEALTHY, rows: 5 })).result).toBeNull();
  });
});
