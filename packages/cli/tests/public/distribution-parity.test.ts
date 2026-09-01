import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type DistributionCapabilityResult,
  type DistributionRuntime,
  REQUIREMENT_COMPILER_CAPABILITIES,
  buildDistributionParityReport,
  normalizeDistributionParityValue,
  resolveDistributionRuntimeProvenance,
  runDistributionParityMatrix,
} from "../../src/public/distribution-parity.js";

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

function observations(
  runtimes: readonly DistributionRuntime[],
  outcome: unknown = {
    proofStatus: "proven",
    gapCodes: [],
    timestamp: "2026-08-10T12:00:00.000Z",
  },
) {
  return runtimes.flatMap((candidate) =>
    REQUIREMENT_COMPILER_CAPABILITIES.map((capability) => ({
      runtimeId: candidate.id,
      capability,
      state: "supported" as const,
      outcome,
      diagnosticIds: ["stable-proof-diagnostic"],
    })),
  );
}

function currentRuntimes() {
  return [
    runtime("source-cli", "source_checkout", "cli"),
    runtime("packed-cli", "packed_artifact", "cli"),
    runtime("source-mcp", "source_checkout", "mcp"),
    runtime("packed-mcp", "packed_artifact", "mcp"),
  ] as const;
}

describe("distribution parity matrix", () => {
  test("resolves symlinked dogfood and pnpm shim entrypoints from execution evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-parity-resolution-"));
    try {
      const packageRoot = join(root, "node_modules", "kibi-cli");
      const bin = join(packageRoot, "bin", "kibi");
      mkdirSync(join(root, "bin"), { recursive: true });
      mkdirSync(join(packageRoot, "bin"), { recursive: true });
      writeFileSync(
        join(packageRoot, "package.json"),
        JSON.stringify({ name: "kibi-cli", version: "0.17.0" }),
      );
      writeFileSync(bin, "#!/usr/bin/env node\n", "utf8");
      symlinkSync(bin, join(root, "bin", "dogfood-kibi"));
      writeFileSync(
        join(root, "bin", "pinned-kibi"),
        `#!/bin/sh\nexec node "${bin}" "$@"\n# cmd-shim-target=${bin}\n`,
        "utf8",
      );

      expect(
        resolveDistributionRuntimeProvenance(join(root, "bin", "dogfood-kibi")),
      ).toMatchObject({
        status: "resolved",
        executable: bin,
        entrypoint: bin,
        packageRoot,
        version: "0.17.0",
        evidence: "executable_resolution",
      });
      expect(
        resolveDistributionRuntimeProvenance(join(root, "bin", "pinned-kibi")),
      ).toMatchObject({
        status: "resolved",
        entrypoint: bin,
        packageRoot,
        version: "0.17.0",
        evidence: "entrypoint_resolution",
      });
      expect(
        resolveDistributionRuntimeProvenance(join(root, "bin", "missing")),
      ).toMatchObject({
        status: "unresolved",
        detail: expect.stringContaining("does not exist"),
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("normalizes volatile evidence while preserving semantic identifiers", () => {
    expect(
      normalizeDistributionParityValue(
        {
          timestamp: "2026-08-10T12:00:00.000Z",
          nested: {
            source: "/tmp/dogfood-project-a/src/service.ts",
            id: "missing_verification_receipt",
            proofStatus: "unproven",
            witness: "REQ-A conflicts with REQ-B",
          },
          requestId: "7a1990ea-b91e-4fd4-ae0a-a6adad637ef2",
        },
        { workspaceRoots: ["/tmp/dogfood-project-a"] },
      ),
    ).toEqual({
      nested: {
        id: "missing_verification_receipt",
        proofStatus: "unproven",
        source: "<workspace>/src/service.ts",
        witness: "REQ-A conflicts with REQ-B",
      },
    });
  });

  test("passes exact source and packed semantic outcomes", () => {
    const runtimes = currentRuntimes();
    const report = buildDistributionParityReport(
      runtimes,
      observations(runtimes),
    );

    expect(report.version).toBe("kibi.distribution-parity.v1");
    expect(report.status).toBe("passed");
    expect(report.issues).toEqual([]);
    expect(report.summary).toMatchObject({
      runtimeCount: 4,
      observationCount: 28,
      matchCount: 28,
      divergenceCount: 0,
      unsupportedCount: 0,
    });
  });

  test("fails closed for current mismatches, failures, and unresolved provenance", () => {
    const runtimes = [
      ...currentRuntimes(),
      runtime("broken-project", "project_resolved", "cli", {
        project: "broken",
        provenance: {
          status: "unresolved",
          executable: "/broken/node_modules/.bin/kibi",
          evidence: "executable_resolution",
          detail: "wrapper target could not be resolved",
        },
      }),
    ];
    const rows = observations(runtimes);
    const changed = rows.map((row) => {
      if (
        row.runtimeId === "packed-cli" &&
        row.capability === "conservative_proof"
      ) {
        return { ...row, outcome: { proofStatus: "unproven" } };
      }
      if (
        row.runtimeId === "packed-mcp" &&
        row.capability === "telemetry_acceptance"
      ) {
        return { ...row, state: "failed" as const, detail: "MCP exited" };
      }
      return row;
    });
    const report = buildDistributionParityReport(runtimes, changed);

    expect(report.status).toBe("failed");
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "unresolved_runtime_provenance",
        "source_packed_mismatch",
        "capability_execution_failed",
      ]),
    );
  });

  test("records unsupported project capabilities without treating them as matches", () => {
    const project = runtime(
      "dogfood-project-b-cli",
      "project_resolved",
      "cli",
      {
        project: "dogfood-project-b",
        actions: {
          repair_plan: {
            kind: "upgrade",
            detail: "Upgrade kibi-cli from 0.14.0 to the current release.",
          },
        },
      },
    );
    const runtimes = [...currentRuntimes(), project];
    const rows = observations(runtimes).map((row) =>
      row.runtimeId === project.id && row.capability === "repair_plan"
        ? {
            ...row,
            state: "unsupported" as const,
            outcome: undefined,
            detail: "repairPlan field is absent",
          }
        : row,
    );
    const report = buildDistributionParityReport(runtimes, rows);
    const projectRow = report.rows.find(
      (row) => row.runtimeId === project.id && row.capability === "repair_plan",
    );

    expect(report.status).toBe("passed");
    expect(projectRow?.comparison).toBe("unsupported");
    expect(projectRow?.action?.kind).toBe("upgrade");
    expect(report.summary.unsupportedCount).toBe(1);
    expect(report.summary.matchCount).toBe(34);
  });

  test("requires an action for every project divergence", () => {
    const project = runtime("legacy-cli", "project_resolved", "cli", {
      project: "legacy",
    });
    const runtimes = [...currentRuntimes(), project];
    const rows = observations(runtimes).map((row) =>
      row.runtimeId === project.id && row.capability === "semantic_inventory"
        ? { ...row, state: "unsupported" as const, outcome: undefined }
        : row,
    );
    const report = buildDistributionParityReport(runtimes, rows);

    expect(report.status).toBe("failed");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "project_divergence_without_action",
        runtimeId: "legacy-cli",
        capability: "semantic_inventory",
      }),
    );
  });

  test("executes every fixture sequentially and turns thrown errors into failed evidence", async () => {
    const calls: string[] = [];
    const resultFor = (
      runtimeId: string,
      capability: string,
    ): DistributionCapabilityResult => ({
      state: "supported",
      outcome: { runtimeId: runtimeId.replace("packed", "source"), capability },
    });
    const adapters = currentRuntimes().map((candidate) => ({
      runtime: candidate,
      execute: async (
        capability: (typeof REQUIREMENT_COMPILER_CAPABILITIES)[number],
      ) => {
        calls.push(`${candidate.id}:${capability}`);
        if (candidate.id === "packed-mcp" && capability === "proof_receipts") {
          throw new Error("fixture process exited 1");
        }
        return resultFor(candidate.id, capability);
      },
    }));

    const report = await runDistributionParityMatrix(adapters);

    expect(calls).toHaveLength(28);
    expect(calls.slice(0, 7)).toEqual(
      REQUIREMENT_COMPILER_CAPABILITIES.map(
        (capability) => `source-cli:${capability}`,
      ),
    );
    expect(report.status).toBe("failed");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "capability_execution_failed",
        runtimeId: "packed-mcp",
        capability: "proof_receipts",
      }),
    );
  });
});
