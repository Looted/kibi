// implements REQ-kibi-distribution-parity-matrix
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type DistributionRuntime,
  REQUIREMENT_COMPILER_CAPABILITIES,
  buildDistributionParityReport,
  nearestPackageInfo,
  nextAncestorDirectory,
  normalizeDistributionParityValue,
  resolveDistributionRuntimeProvenance,
  runDistributionParityMatrix,
  sortedUnique,
} from "../../src/public/distribution-parity.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
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
      executable: `/runtime/${id}`,
      entrypoint: `/runtime/${id}/entrypoint.js`,
      version: "1.0.0",
      evidence: "entrypoint_resolution",
    },
    ...overrides,
  };
}

describe("distribution-parity leftover provenance, normalize, and issue branches", () => {
  test("resolves import entrypoints, missing versions, and invalid manifests", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-parity-rem-");
    roots.push(root);
    const nested = path.join(root, "pkg", "dist");
    mkdirSync(nested, { recursive: true });
    writeFileSync(path.join(root, "pkg", "package.json"), "{not json");
    const realEntry = path.join(nested, "real-cli.js");
    writeFileSync(realEntry, "#!/usr/bin/env node\nexport {};\n");
    // Build the import text without a static `from "/..."` token so Bun's
    // test bundler does not try to resolve a fixture path as a module.
    const shimImport = ["export {}", " from ", JSON.stringify(realEntry)].join(
      "",
    );
    writeFileSync(
      path.join(nested, "cli.js"),
      `# cmd-shim-target=${path.basename(realEntry)}\n${shimImport}\n`,
    );
    const unresolvedJson = resolveDistributionRuntimeProvenance(
      path.join(nested, "cli.js"),
    );
    expect(unresolvedJson.status).toBe("resolved");
    expect(unresolvedJson.packageRoot).toBeDefined();
    expect(unresolvedJson.version).toBeUndefined();
    expect(unresolvedJson.evidence).toBe("entrypoint_resolution");

    const noVersion = createTempDir("kibi-parity-ver-");
    roots.push(noVersion);
    writeFileSync(
      path.join(noVersion, "package.json"),
      JSON.stringify({ name: "kibi-cli" }),
    );
    writeFileSync(path.join(noVersion, "bin.js"), "#!/usr/bin/env node\n");
    expect(
      resolveDistributionRuntimeProvenance(path.join(noVersion, "bin.js")).version,
    ).toBeUndefined();

    const unreadable = resolveDistributionRuntimeProvenance(root);
    expect(unreadable.status).toBe("unresolved");

    const importOnly = createTempDir("kibi-parity-import-");
    roots.push(importOnly);
    const imported = path.join(importOnly, "imported.js");
    writeFileSync(imported, "export {};\n");
    writeFileSync(path.join(importOnly, "package.json"), '{"name":"kibi-cli"}');
    writeFileSync(
      path.join(importOnly, "shim.js"),
      ["export {}", " from ", JSON.stringify(imported)].join(""),
    );
    const fromImport = resolveDistributionRuntimeProvenance(
      path.join(importOnly, "shim.js"),
    );
    expect(fromImport.status).toBe("resolved");
    expect(fromImport.evidence).toBe("entrypoint_resolution");
    expect(fromImport.entrypoint).toBe(imported);
  });

  test("normalizes primitives, arrays, timestamps, uuids, and custom volatile keys", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(normalizeDistributionParityValue(3)).toBe(3);
    expect(normalizeDistributionParityValue(null)).toBeNull();
    expect(
      normalizeDistributionParityValue(
        ["2026-08-10T12:00:00.000Z", "7a1990ea-b91e-4fd4-ae0a-a6adad637ef2"],
        { workspaceRoots: ["/tmp/a"] },
      ),
    ).toEqual(["<timestamp>", "<uuid>"]);
    expect(
      normalizeDistributionParityValue(
        { keep: 1, drop: "x" },
        { volatileKeys: new Set(["drop"]) },
      ),
    ).toEqual({ keep: 1 });
  });

  test("records duplicate runtimes, missing currents, and observation gaps", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const source = runtime("source-cli", "source_checkout", "cli");
    const packed = runtime("packed-cli", "packed_artifact", "cli");
    const report = buildDistributionParityReport(
      [
        source,
        source,
        packed,
        runtime("orphan-mcp", "project_resolved", "mcp", { project: "x" }),
      ],
      [
        {
          runtimeId: "source-cli",
          capability: "semantic_inventory",
          state: "supported",
          outcome: { ok: true },
        },
        {
          runtimeId: "source-cli",
          capability: "semantic_inventory",
          state: "supported",
          outcome: { ok: false },
        },
        {
          runtimeId: "source-cli",
          capability: "conservative_proof",
          state: "unsupported",
        },
        {
          runtimeId: "source-cli",
          capability: "repair_plan",
          state: "failed",
          detail: "status exploded",
        },
        {
          runtimeId: "packed-cli",
          capability: "semantic_inventory",
          state: "unsupported",
        },
        {
          runtimeId: "packed-cli",
          capability: "contradiction_witnesses",
          state: "supported",
          outcome: { ok: 1 },
        },
      ],
    );
    const codes = report.issues.map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "duplicate_runtime_id",
        "missing_current_runtime",
        "duplicate_capability_observation",
        "missing_capability_observation",
        "current_capability_unsupported",
        "capability_execution_failed",
      ]),
    );
  });

  test("requires an action for project outcome divergence and records packed unsupported", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const runtimes = [
      runtime("source-cli", "source_checkout", "cli"),
      runtime("packed-cli", "packed_artifact", "cli"),
      runtime("source-mcp", "source_checkout", "mcp"),
      runtime("packed-mcp", "packed_artifact", "mcp"),
      runtime("legacy-cli", "project_resolved", "cli", {
        project: "legacy",
        actions: {
          semantic_inventory: {
            kind: "compatibility",
            detail: "pin the inventory shape",
          },
        },
      }),
    ];
    const observations = runtimes.flatMap((candidate) =>
      REQUIREMENT_COMPILER_CAPABILITIES.map((capability) => ({
        runtimeId: candidate.id,
        capability,
        state:
          candidate.id === "legacy-cli" && capability === "semantic_inventory"
            ? ("supported" as const)
            : ("supported" as const),
        outcome:
          candidate.id === "legacy-cli" && capability === "semantic_inventory"
            ? { proofStatus: "diverged" }
            : { proofStatus: "proven" },
      })),
    );
    const report = buildDistributionParityReport(runtimes, observations);
    const diverged = report.rows.find(
      (row) =>
        row.runtimeId === "legacy-cli" &&
        row.capability === "semantic_inventory",
    );
    expect(diverged?.comparison).toBe("diverged");
    expect(diverged?.action?.kind).toBe("compatibility");
  });

  test("turns non-Error adapter throws into failed observations", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const report = await runDistributionParityMatrix([
      {
        runtime: runtime("source-cli", "source_checkout", "cli"),
        execute: async () => {
          throw "fixture exploded";
        },
      },
    ]);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "capability_execution_failed",
        detail: "fixture exploded",
      }),
    );
  });

  test("walks to the filesystem root and treats missing diagnostic ids as empty", () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-parity-root-");
    roots.push(root);
    const executable = path.join(root, "orphan-cli.js");
    writeFileSync(executable, "#!/usr/bin/env node\nexport {};\n");
    const provenance = resolveDistributionRuntimeProvenance(executable);
    expect(provenance.status).toBe("resolved");
    expect(provenance.packageRoot).toBeUndefined();

    const report = buildDistributionParityReport(
      [runtime("source-cli", "source_checkout", "cli")],
      REQUIREMENT_COMPILER_CAPABILITIES.map((capability) => ({
        runtimeId: "source-cli",
        capability,
        state: "supported" as const,
        outcome: { proofStatus: "proven" },
      })),
    );
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows[0]?.diagnosticIds).toEqual([]);
  });

  test("nearestPackageInfo and sortedUnique cover walk and undefined-list leftovers", () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-parity-walk-");
    roots.push(root);
    mkdirSync(path.join(root, "nested", "deep"), { recursive: true });
    writeFileSync(
      path.join(root, "nested", "deep", "entry.js"),
      "export {};\n",
    );
    writeFileSync(path.join(root, "package.json"), "{not-json");
    expect(
      nearestPackageInfo(path.join(root, "nested", "deep", "entry.js")),
    ).toEqual({ packageRoot: root });
    expect(sortedUnique(undefined)).toEqual([]);
    expect(sortedUnique(["b", "a", "b"])).toEqual(["a", "b"]);
    expect(nextAncestorDirectory("/")).toBeUndefined();
    expect(nextAncestorDirectory(path.join(root, "nested"))).toBe(root);
  });
});
