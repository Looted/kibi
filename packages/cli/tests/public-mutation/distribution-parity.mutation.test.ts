import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DISTRIBUTION_PARITY_VERSION,
  type DistributionParityObservation,
  type DistributionRuntime,
  REQUIREMENT_COMPILER_CAPABILITIES,
  type RequirementCompilerCapability,
  buildDistributionParityReport,
  nearestPackageInfo,
  nextAncestorDirectory,
  normalizeDistributionParityValue,
  resolveDistributionRuntimeProvenance,
  runDistributionParityMatrix,
  sortedUnique,
} from "../../src/public/distribution-parity.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-parity-")));
  roots.push(root);
  return root;
}

function write(file: string, contents: string): string {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, contents);
  return file;
}

describe("package lookup", () => {
  test("steps to the parent directory until the root", () => {
    expect(nextAncestorDirectory("/a/b")).toBe("/a");
    expect(nextAncestorDirectory("/")).toBeUndefined();
  });

  test("reads the nearest manifest", () => {
    const root = workspace();
    write(join(root, "package.json"), '{"version":"1.0.0"}');
    write(join(root, "inner", "package.json"), '{"name":"é"}');
    write(join(root, "bad", "package.json"), "{oops");
    write(join(root, "nulled", "package.json"), '{"version":null}');
    expect(nearestPackageInfo(join(root, "a", "b", "bin.js"))).toStrictEqual({
      packageRoot: root,
      version: "1.0.0",
    });
    expect(nearestPackageInfo(join(root, "inner", "bin.js"))).toStrictEqual({
      packageRoot: join(root, "inner"),
    });
    expect(nearestPackageInfo(join(root, "bad", "x", "bin.js"))).toStrictEqual({
      packageRoot: join(root, "bad"),
    });
    expect(
      nearestPackageInfo(join(root, "nulled", "bin.js")) as unknown,
    ).toStrictEqual({
      packageRoot: join(root, "nulled"),
      version: null,
    });
  });

  test("returns nothing without a manifest up to the root", () => {
    expect(existsSync("/package.json")).toBe(false);
    expect(nearestPackageInfo("/kibi-missing-dir/bin.js")).toStrictEqual({});
  });
});

describe("runtime provenance", () => {
  test("reports a missing executable", () => {
    const root = workspace();
    const missing = join(root, "nope");
    expect(resolveDistributionRuntimeProvenance(missing)).toStrictEqual({
      status: "unresolved",
      executable: missing,
      evidence: "executable_resolution",
      detail: `Executable does not exist: ${missing}`,
    });
  });

  test("resolves a plain executable through symlinks", () => {
    const root = workspace();
    write(join(root, "package.json"), '{"version":"2.0.0"}');
    const real = write(join(root, "bin", "kibi.js"), "console.log(1);\n");
    const link = join(root, "link.js");
    symlinkSync(real, link);
    expect(resolveDistributionRuntimeProvenance(link)).toStrictEqual({
      status: "resolved",
      executable: real,
      entrypoint: real,
      packageRoot: root,
      version: "2.0.0",
      evidence: "executable_resolution",
    });
  });

  test("follows a trimmed shim target relative to the executable", () => {
    const root = workspace();
    const target = write(join(root, "lib", "main.js"), "");
    const shim = write(
      join(root, "bin", "kibi"),
      "#!/bin/sh\n# cmd-shim-target=  ../lib/main.js  \nexec node\n",
    );
    expect(resolveDistributionRuntimeProvenance(shim)).toStrictEqual({
      status: "resolved",
      executable: shim,
      entrypoint: target,
      evidence: "entrypoint_resolution",
    });
  });

  test("requires the shim marker at the start of a whole line", () => {
    const root = workspace();
    write(join(root, "lib", "main.js"), "");
    for (const contents of [
      "x# cmd-shim-target=../lib/main.js\n",
      "# cmd-shim-target=   \n",
    ]) {
      const shim = write(join(root, "bin", "kibi"), contents);
      const result = resolveDistributionRuntimeProvenance(shim);
      expect(result.status === "resolved" ? result.entrypoint : null).toBe(
        shim,
      );
    }
  });

  test("follows an absolute import", () => {
    const root = workspace();
    const target = write(join(root, "dist", "cli.js"), "");
    for (const contents of [
      `import run from "${target}";\n`,
      `import run from\t'${target}';\n`,
      `import run from  "${target}";\n`,
    ]) {
      const bin = write(join(root, "bin", "kibi.mjs"), contents);
      const result = resolveDistributionRuntimeProvenance(bin);
      expect(result.status === "resolved" ? result.entrypoint : null).toBe(
        target,
      );
      expect(result.evidence).toBe("entrypoint_resolution");
    }
    for (const contents of [
      `import run from"${target}";\n`,
      `import run xfrom "${target}";\n`,
      'import run from "./cli.js";\n',
    ]) {
      const bin = write(join(root, "bin", "kibi.mjs"), contents);
      const result = resolveDistributionRuntimeProvenance(bin);
      expect(result.status === "resolved" ? result.entrypoint : null).toBe(bin);
    }
  });

  test("reports a declared entrypoint that does not exist", () => {
    const root = workspace();
    const shim = write(join(root, "kibi"), "# cmd-shim-target=./gone.js\n");
    const result = resolveDistributionRuntimeProvenance(shim);
    expect(result.status).toBe("unresolved");
    expect(result.executable).toBe(shim);
    expect(result.evidence).toBe("executable_resolution");
    expect(result.detail).toContain("gone.js");
    expect(Object.keys(result).sort()).toEqual([
      "detail",
      "evidence",
      "executable",
      "status",
    ]);
  });

  test("reports a thrown non-error value as text", () => {
    const root = workspace();
    const bin = write(join(root, "kibi"), "");
    const spy = spyOn(fs, "realpathSync").mockImplementation(((): never => {
      throw "denied";
    }) as unknown as typeof fs.realpathSync);
    try {
      expect(resolveDistributionRuntimeProvenance(bin)).toStrictEqual({
        status: "unresolved",
        executable: bin,
        evidence: "executable_resolution",
        detail: "denied",
      });
    } finally {
      spy.mockRestore();
    }
  });
});

describe("value normalization", () => {
  test("replaces the longest workspace root first", () => {
    expect(
      normalizeDistributionParityValue("/w/sub/x and /w/y", {
        workspaceRoots: ["/w", "/w/sub"],
      }),
    ).toBe("<workspace>/x and <workspace>/y");
    expect(
      normalizeDistributionParityValue("/w/sub/x", {
        workspaceRoots: ["/w/sub", "/w"],
      }),
    ).toBe("<workspace>/x");
    expect(normalizeDistributionParityValue("Stryker was here")).toBe(
      "Stryker was here",
    );
  });

  test("masks uuids and timestamps", () => {
    expect(
      normalizeDistributionParityValue(
        "id 123E4567-E89B-42D3-A456-426614174000 at 2026-01-02T03:04:05Z and 2026-01-02T03:04:05.678Z",
      ),
    ).toBe("id <uuid> at <timestamp> and <timestamp>");
  });

  test("sorts keys and drops volatile ones", () => {
    const volatile = [
      "_diagnostic_telemetry",
      "active_branch",
      "artifact_digest",
      "branch",
      "branchName",
      "code_snapshot",
      "created_at",
      "createdAt",
      "elapsedMs",
      "environment_hash",
      "finished_at",
      "finishedAt",
      "pid",
      "planId",
      "prologPid",
      "receipt_id",
      "request_id",
      "requestId",
      "snapshot_id",
      "snapshotId",
      "started_at",
      "startedAt",
      "timestamp",
      "updated_at",
      "updatedAt",
      "usageLogLineNumber",
      "proofSnapshot",
      "attachedIno",
      "attachedDev",
    ];
    const input = Object.fromEntries([
      ["z", 1],
      ...volatile.map((key) => [key, "x"]),
      ["", 2],
      ["a", [{ pid: 1, keep: null }]],
    ]);
    const normalized = normalizeDistributionParityValue(input);
    expect(normalized).toStrictEqual({ "": 2, a: [{ keep: null }], z: 1 });
    expect(Object.keys(normalized as object)).toEqual(["", "a", "z"]);
    expect(
      normalizeDistributionParityValue(
        { pid: 1, b: 2 },
        { volatileKeys: new Set(["b"]) },
      ),
    ).toStrictEqual({ pid: 1 });
    expect(normalizeDistributionParityValue(null)).toBeNull();
    expect(normalizeDistributionParityValue(3)).toBe(3);
  });

  test("sorts unique strings", () => {
    expect(sortedUnique(undefined)).toEqual([]);
    expect(sortedUnique(["b", "a", "b"])).toEqual(["a", "b"]);
  });
});

function runtime(
  id: string,
  kind: DistributionRuntime["kind"],
  surface: DistributionRuntime["surface"],
  overrides: Partial<DistributionRuntime> = {},
): DistributionRuntime {
  return {
    id,
    kind,
    surface,
    provenance: {
      status: "resolved",
      executable: `/r/${id}`,
      evidence: "executable_resolution",
    },
    ...overrides,
  };
}

const CAP: RequirementCompilerCapability = "repair_plan";

function observe(
  runtimeId: string,
  extra: Partial<DistributionParityObservation> = {},
  capabilities: readonly RequirementCompilerCapability[] = REQUIREMENT_COMPILER_CAPABILITIES,
): DistributionParityObservation[] {
  return capabilities.map((capability) => ({
    runtimeId,
    capability,
    state: "supported",
    outcome: { v: 1 },
    ...(capability === CAP ? extra : {}),
  }));
}

const current = [
  runtime("src-cli", "source_checkout", "cli"),
  runtime("pkg-cli", "packed_artifact", "cli"),
  runtime("src-mcp", "source_checkout", "mcp"),
  runtime("pkg-mcp", "packed_artifact", "mcp"),
];
const currentObservations = current.flatMap((entry) => observe(entry.id));

function row(
  report: ReturnType<typeof buildDistributionParityReport>,
  runtimeId: string,
) {
  return report.rows.find(
    (entry) => entry.runtimeId === runtimeId && entry.capability === CAP,
  );
}

describe("parity report", () => {
  test("passes matching current runtimes", () => {
    const report = buildDistributionParityReport(
      [...current].reverse(),
      currentObservations,
    );
    expect(report.version).toBe(DISTRIBUTION_PARITY_VERSION);
    expect(DISTRIBUTION_PARITY_VERSION).toBe("kibi.distribution-parity.v1");
    expect(report.status).toBe("passed");
    expect(report.issues).toEqual([]);
    expect(report.capabilities).toBe(REQUIREMENT_COMPILER_CAPABILITIES);
    expect(report.runtimes.map((entry) => entry.id)).toEqual([
      "pkg-cli",
      "pkg-mcp",
      "src-cli",
      "src-mcp",
    ]);
    expect(report.rows.map((entry) => entry.runtimeId)).toEqual(
      ["pkg-cli", "pkg-mcp", "src-cli", "src-mcp"].flatMap((id) =>
        REQUIREMENT_COMPILER_CAPABILITIES.map(() => id),
      ),
    );
    expect(row(report, "src-cli")).toStrictEqual({
      runtimeId: "src-cli",
      kind: "source_checkout",
      surface: "cli",
      capability: CAP,
      state: "supported",
      comparison: "match",
      normalizedOutcome: { v: 1 },
      diagnosticIds: [],
    });
    expect(row(report, "pkg-mcp")).toStrictEqual({
      runtimeId: "pkg-mcp",
      kind: "packed_artifact",
      surface: "mcp",
      capability: CAP,
      state: "supported",
      comparison: "match",
      referenceRuntimeId: "src-mcp",
      normalizedOutcome: { v: 1 },
      diagnosticIds: [],
    });
    expect(report.summary).toStrictEqual({
      runtimeCount: 4,
      observationCount: 28,
      matchCount: 28,
      divergenceCount: 0,
      unsupportedCount: 0,
      failedCount: 0,
      actionCount: 0,
    });
  });

  test("records runtime declaration issues", () => {
    const report = buildDistributionParityReport(
      [
        runtime("a", "packed_artifact", "cli", {
          provenance: {
            status: "unresolved",
            executable: "/a",
            evidence: "executable_resolution",
            detail: "gone",
          },
        }),
        runtime("a", "project_resolved", "mcp", {
          provenance: {
            status: "unresolved",
            executable: "/a",
            evidence: "executable_resolution",
          },
        }),
      ],
      [],
    );
    expect(
      report.issues.filter(
        (issue) => issue.code !== "missing_capability_observation",
      ),
    ).toStrictEqual([
      {
        code: "unresolved_runtime_provenance",
        runtimeId: "a",
        surface: "cli",
        detail: "gone",
      },
      {
        code: "duplicate_runtime_id",
        runtimeId: "a",
        surface: "mcp",
        detail: "Runtime id a is declared more than once.",
      },
      {
        code: "unresolved_runtime_provenance",
        runtimeId: "a",
        surface: "mcp",
        detail: "Runtime a has no executable resolution evidence.",
      },
      {
        code: "missing_current_runtime",
        surface: "cli",
        detail: "Missing source_checkout runtime for cli.",
      },
      {
        code: "missing_current_runtime",
        surface: "mcp",
        detail: "Missing source_checkout runtime for mcp.",
      },
      {
        code: "missing_current_runtime",
        surface: "mcp",
        detail: "Missing packed_artifact runtime for mcp.",
      },
    ]);
  });

  test("matches current runtimes by kind and surface", () => {
    const report = buildDistributionParityReport(
      [
        runtime("x", "packed_artifact", "mcp"),
        runtime("y", "source_checkout", "mcp"),
      ],
      [],
    );
    expect(
      report.issues
        .filter((issue) => issue.code === "missing_current_runtime")
        .map((issue) => issue.detail),
    ).toEqual([
      "Missing source_checkout runtime for cli.",
      "Missing packed_artifact runtime for cli.",
    ]);
  });

  test("compares a second source checkout by its own state", () => {
    const report = buildDistributionParityReport(
      [
        ...current.slice(0, 2),
        runtime("src-cli-2", "source_checkout", "cli"),
        runtime("lone-mcp", "packed_artifact", "mcp"),
      ],
      [
        ...observe("src-cli"),
        ...observe("pkg-cli"),
        ...observe("src-cli-2", { outcome: { v: 9 } }),
        ...observe("lone-mcp"),
      ],
    );
    expect(report.status).toBe("failed");
    expect(row(report, "src-cli-2")).toStrictEqual({
      runtimeId: "src-cli-2",
      kind: "source_checkout",
      surface: "cli",
      capability: CAP,
      state: "supported",
      comparison: "match",
      normalizedOutcome: { v: 9 },
      diagnosticIds: [],
    });
    expect(row(report, "lone-mcp")).toStrictEqual({
      runtimeId: "lone-mcp",
      kind: "packed_artifact",
      surface: "mcp",
      capability: CAP,
      state: "supported",
      comparison: "not_compared",
      normalizedOutcome: { v: 1 },
      diagnosticIds: [],
    });
  });

  test("keeps the first of duplicate observations", () => {
    const report = buildDistributionParityReport(current, [
      ...currentObservations,
      { runtimeId: "pkg-cli", capability: CAP, state: "failed" },
    ]);
    expect(report.issues).toStrictEqual([
      {
        code: "duplicate_capability_observation",
        runtimeId: "pkg-cli",
        capability: CAP,
        detail:
          "Capability repair_plan was observed more than once for pkg-cli.",
      },
    ]);
    expect(row(report, "pkg-cli")?.state).toBe("supported");
    expect(report.summary.observationCount).toBe(29);
  });

  test("records missing observations", () => {
    const withProject = [
      ...current,
      runtime("proj", "project_resolved", "cli", {
        project: "demo",
        actions: { [CAP]: { kind: "upgrade", detail: "bump" } },
      }),
      runtime("orphan", "project_resolved", "mcp"),
    ];
    const observations = [
      ...currentObservations,
      ...observe("orphan"),
      ...observe("proj"),
    ].filter(
      (entry) =>
        entry.capability !== CAP ||
        !["src-cli", "orphan", "proj"].includes(entry.runtimeId),
    );
    const report = buildDistributionParityReport(withProject, observations);
    expect(row(report, "proj")).toStrictEqual({
      runtimeId: "proj",
      kind: "project_resolved",
      surface: "cli",
      project: "demo",
      capability: CAP,
      state: "missing",
      comparison: "not_compared",
      referenceRuntimeId: "src-cli",
      diagnosticIds: [],
      action: { kind: "upgrade", detail: "bump" },
    });
    expect(row(report, "src-cli")).toStrictEqual({
      runtimeId: "src-cli",
      kind: "source_checkout",
      surface: "cli",
      capability: CAP,
      state: "missing",
      comparison: "not_compared",
      referenceRuntimeId: "src-cli",
      diagnosticIds: [],
    });
    expect(
      report.issues.filter(
        (issue) => issue.code === "missing_capability_observation",
      ),
    ).toStrictEqual([
      {
        code: "missing_capability_observation",
        runtimeId: "orphan",
        surface: "mcp",
        capability: CAP,
        detail: "Runtime orphan has no repair_plan observation.",
      },
      {
        code: "missing_capability_observation",
        runtimeId: "proj",
        surface: "cli",
        capability: CAP,
        detail: "Runtime proj has no repair_plan observation.",
      },
      {
        code: "missing_capability_observation",
        runtimeId: "src-cli",
        surface: "cli",
        capability: CAP,
        detail: "Runtime src-cli has no repair_plan observation.",
      },
    ]);
    expect(report.summary.actionCount).toBe(1);
    const noSource = buildDistributionParityReport(
      [runtime("p", "packed_artifact", "cli")],
      [],
    );
    expect(row(noSource, "p")).toStrictEqual({
      runtimeId: "p",
      kind: "packed_artifact",
      surface: "cli",
      capability: CAP,
      state: "missing",
      comparison: "not_compared",
      diagnosticIds: [],
    });
  });

  test("reports source runtimes by their own state", () => {
    const report = buildDistributionParityReport(current, [
      ...observe("src-cli", {
        state: "unsupported",
        outcome: { v: 2 },
        detail: "no",
      }),
      ...observe("src-mcp", { state: "failed" }),
      ...observe("pkg-cli"),
      ...observe("pkg-mcp", {
        state: "failed",
        detail: "boom",
        diagnosticIds: ["b", "a", "b"],
      }),
    ]);
    expect(row(report, "src-cli")).toStrictEqual({
      runtimeId: "src-cli",
      kind: "source_checkout",
      surface: "cli",
      capability: CAP,
      state: "unsupported",
      comparison: "unsupported",
      diagnosticIds: [],
      detail: "no",
    });
    expect(row(report, "src-mcp")?.comparison).toBe("failed");
    expect(row(report, "pkg-cli")?.comparison).toBe("not_compared");
    expect(row(report, "pkg-mcp")).toStrictEqual({
      runtimeId: "pkg-mcp",
      kind: "packed_artifact",
      surface: "mcp",
      capability: CAP,
      state: "failed",
      comparison: "failed",
      referenceRuntimeId: "src-mcp",
      diagnosticIds: ["a", "b"],
      detail: "boom",
    });
    expect(report.issues).toStrictEqual([
      {
        code: "capability_execution_failed",
        runtimeId: "pkg-mcp",
        surface: "mcp",
        capability: CAP,
        detail: "boom",
      },
      {
        code: "current_capability_unsupported",
        runtimeId: "src-cli",
        surface: "cli",
        capability: CAP,
        detail: "Current source_checkout runtime does not support repair_plan.",
      },
      {
        code: "capability_execution_failed",
        runtimeId: "src-mcp",
        surface: "mcp",
        capability: CAP,
        detail: "Runtime src-mcp failed while executing repair_plan.",
      },
    ]);
    expect(report.summary).toMatchObject({
      matchCount: 24,
      unsupportedCount: 1,
      failedCount: 2,
    });
  });

  test("flags packed divergence and unsupported packed capabilities", () => {
    const report = buildDistributionParityReport(current, [
      ...observe("src-cli"),
      ...observe("src-mcp"),
      ...observe("pkg-cli", { outcome: { v: 2 } }),
      ...observe("pkg-mcp", { state: "unsupported" }),
    ]);
    expect(row(report, "pkg-cli")).toMatchObject({
      comparison: "diverged",
      normalizedOutcome: { v: 2 },
    });
    expect(row(report, "pkg-mcp")?.comparison).toBe("unsupported");
    expect(row(report, "pkg-mcp")).not.toHaveProperty("normalizedOutcome");
    expect(report.issues).toStrictEqual([
      {
        code: "source_packed_mismatch",
        runtimeId: "pkg-cli",
        surface: "cli",
        capability: CAP,
        detail: "Packed cli outcome diverges from source for repair_plan.",
      },
      {
        code: "current_capability_unsupported",
        runtimeId: "pkg-mcp",
        surface: "mcp",
        capability: CAP,
        detail: "Current packed_artifact runtime does not support repair_plan.",
      },
    ]);
    expect(report.summary.divergenceCount).toBe(1);
  });

  test("compares after normalizing with the given options", () => {
    const report = buildDistributionParityReport(
      current,
      [
        ...observe("src-cli", { outcome: { path: "/a/x", pid: 1 } }),
        ...observe("pkg-cli", { outcome: { path: "/b/x", pid: 2 } }),
        ...observe("src-mcp"),
        ...observe("pkg-mcp"),
      ],
      { workspaceRoots: ["/a", "/b"] },
    );
    expect(report.status).toBe("passed");
    expect(row(report, "pkg-cli")?.normalizedOutcome).toStrictEqual({
      path: "<workspace>/x",
    });
  });

  test("requires actions for project divergence", () => {
    const projects = [
      runtime("p-div", "project_resolved", "cli", { project: "one" }),
      runtime("p-uns", "project_resolved", "cli"),
      runtime("p-act", "project_resolved", "cli", {
        actions: { [CAP]: { kind: "compatibility", detail: "shim" } },
      }),
      runtime("p-ok", "project_resolved", "cli"),
      runtime("p-fail", "project_resolved", "cli"),
    ];
    const report = buildDistributionParityReport(
      [...current, ...projects],
      [
        ...currentObservations,
        ...observe("p-div", { outcome: { v: 3 } }),
        ...observe("p-uns", { state: "unsupported" }),
        ...observe("p-act", { outcome: { v: 3 } }),
        ...observe("p-ok"),
        ...observe("p-fail", { state: "failed" }),
      ],
    );
    expect(report.issues).toStrictEqual([
      {
        code: "project_divergence_without_action",
        runtimeId: "p-div",
        surface: "cli",
        capability: CAP,
        detail:
          "Project runtime p-div needs an upgrade or compatibility action for repair_plan.",
      },
      {
        code: "capability_execution_failed",
        runtimeId: "p-fail",
        surface: "cli",
        capability: CAP,
        detail: "Runtime p-fail failed while executing repair_plan.",
      },
      {
        code: "project_divergence_without_action",
        runtimeId: "p-uns",
        surface: "cli",
        capability: CAP,
        detail:
          "Project runtime p-uns needs an upgrade or compatibility action for repair_plan.",
      },
    ]);
    expect(row(report, "p-div")).toStrictEqual({
      runtimeId: "p-div",
      kind: "project_resolved",
      surface: "cli",
      project: "one",
      capability: CAP,
      state: "supported",
      comparison: "diverged",
      referenceRuntimeId: "src-cli",
      normalizedOutcome: { v: 3 },
      diagnosticIds: [],
    });
    expect(row(report, "p-act")).toMatchObject({
      comparison: "diverged",
      action: { kind: "compatibility", detail: "shim" },
    });
    expect(row(report, "p-ok")?.comparison).toBe("match");
    expect(report.summary.actionCount).toBe(1);
  });
});

describe("parity matrix", () => {
  test("runs every capability and records thrown failures", async () => {
    const calls: string[] = [];
    const report = await runDistributionParityMatrix(
      [
        {
          runtime: runtime("src-cli", "source_checkout", "cli"),
          execute: async (capability) => {
            calls.push(capability);
            if (capability === "repair_plan") throw new Error("broke");
            if (capability === "proof_contract") throw "plain";
            return { state: "supported", outcome: { capability } };
          },
        },
      ],
      { volatileKeys: new Set(["capability"]) },
    );
    expect(calls).toEqual([...REQUIREMENT_COMPILER_CAPABILITIES]);
    expect(row(report, "src-cli")).toStrictEqual({
      runtimeId: "src-cli",
      kind: "source_checkout",
      surface: "cli",
      capability: CAP,
      state: "failed",
      comparison: "failed",
      diagnosticIds: [],
      detail: "broke",
    });
    expect(
      report.rows.find((entry) => entry.capability === "proof_contract")
        ?.detail,
    ).toBe("plain");
    expect(
      report.rows.find((entry) => entry.capability === "semantic_inventory"),
    ).toMatchObject({ state: "supported", normalizedOutcome: {} });
    expect(report.summary.observationCount).toBe(7);
  });

  test("uses default options", async () => {
    const report = await runDistributionParityMatrix([]);
    expect(report.rows).toEqual([]);
    expect(report.summary.runtimeCount).toBe(0);
  });
});
