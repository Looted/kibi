import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  claimPlanActivation,
  classifyActivation,
  legacyKbActivation,
  missingManifestActivation,
} from "../../../src/operations/bootstrap/activation.js";
import type {
  ActivationPolicy,
  Candidate,
} from "../../../src/operations/bootstrap/types.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as config from "../../../src/utils/config.js";
import * as manifest from "../../../src/utils/kb-manifest.js";

const COLD: ActivationPolicy = {
  activationState: "root_uninitialized",
  activationMode: "cold_start_bootstrap",
  applyBlocked: true,
  allowCandidateGeneration: true,
  allowDeclaredClaims: true,
  reason:
    "Workspace has no attached root KB yet; run `kibi init` before planning bootstrap knowledge.",
  handoffMessage:
    "Kibi infrastructure is not initialized. Run `kibi init`, then ask the agent to bootstrap this repository.",
};
const VENDORED: ActivationPolicy = {
  activationState: "vendored_only",
  activationMode: "vendored_blocked",
  applyBlocked: true,
  allowCandidateGeneration: false,
  allowDeclaredClaims: false,
  reason:
    "Workspace appears to contain vendored Kibi sources only; bootstrap generation is blocked in this posture.",
  handoffMessage:
    "Vendored Kibi posture detected. Move to the real project root before attempting bootstrap.",
};
const PARTIAL: ActivationPolicy = {
  activationState: "root_partial",
  activationMode: "repair_bootstrap",
  applyBlocked: true,
  allowCandidateGeneration: true,
  allowDeclaredClaims: true,
  reason:
    "Workspace root is only partially configured; run a repair bootstrap scan and keep apply blocked until the root is repaired.",
};
const THIN: ActivationPolicy = {
  activationState: "root_active_thin",
  activationMode: "attached_thin_bootstrap",
  applyBlocked: false,
  allowCandidateGeneration: true,
  allowDeclaredClaims: true,
  reason:
    "Workspace has an attached but unseeded KB; deterministic bootstrap planning is eligible.",
};
const SEEDED: ActivationPolicy = {
  activationState: "root_active_seeded",
  activationMode: "attached_seeded_handoff",
  applyBlocked: true,
  allowCandidateGeneration: false,
  allowDeclaredClaims: true,
  reason:
    "Workspace already has an attached seeded KB; discovered bootstrap candidates are replaced by an explicit seeded handoff, and only declared intent claims are planned against the existing KB.",
  handoffMessage:
    "Attached seeded KB detected. Kibi does not generate discovered bootstrap candidates here: use kb_search and kb_query for existing KB context. Declare cited intentClaims in bootstrapContext to plan them against the existing KB, or compile each claim with kb_compile_intent.",
};

describe("fixed postures", () => {
  test("missing manifest", () => {
    expect(missingManifestActivation(true, false)).toStrictEqual(VENDORED);
    expect(missingManifestActivation(true, true)).toStrictEqual(COLD);
    expect(missingManifestActivation(false, false)).toStrictEqual(COLD);
  });

  test("legacy KB", () => {
    expect(legacyKbActivation()).toStrictEqual({
      activationState: "root_partial",
      activationMode: "repair_bootstrap",
      applyBlocked: true,
      allowCandidateGeneration: true,
      allowDeclaredClaims: true,
      reason:
        "Workspace has a legacy .kb/config.json and no .kb/manifest.json; run `kibi migrate --yes` (it creates the manifest from the legacy .kb/config.json; do not run kibi init first) before planning bootstrap knowledge.",
      handoffMessage:
        "This knowledge base was written by an older Kibi. Run `kibi migrate --yes` (it creates the manifest from the legacy .kb/config.json; do not run kibi init first), then check kb_status again.",
      nextOperation: "kibi migrate --yes",
    });
  });
});

describe("claimPlanActivation", () => {
  const claim = { sourceKind: "intent_claim" } as Candidate;
  const other = { sourceKind: "typed_markdown" } as Candidate;
  const seeded = SEEDED as Parameters<typeof claimPlanActivation>[0];

  test("unblocks a seeded plan of declared claims only", () => {
    expect(claimPlanActivation(seeded, [claim, claim])).toStrictEqual({
      ...SEEDED,
      applyBlocked: false,
      reason:
        "Workspace already has an attached seeded KB; discovered bootstrap candidates are not generated, and the plan holds only declared intent claims that are not yet in the KB.",
      handoffMessage:
        "Attached seeded KB detected. The plan holds only your declared intent claims, deduplicated against the existing KB: review it and call kb_apply_plan after explicit approval. Discovered candidates are not generated here; use kb_search and kb_query for existing knowledge, and compile any claim left in sourceOnlySignals with kb_compile_intent.",
    });
  });

  test("keeps every other plan as it is", () => {
    const thin = THIN as Parameters<typeof claimPlanActivation>[0];
    expect(claimPlanActivation(thin, [claim])).toBe(thin);
    expect(claimPlanActivation(seeded, [])).toBe(seeded);
    expect(claimPlanActivation(seeded, [claim, other])).toBe(seeded);
  });
});

describe("classifyActivation", () => {
  let status: ReturnType<typeof spyOn<typeof manifest, "readKbManifestStatus">>;
  let legacy: ReturnType<typeof spyOn<typeof config, "readLegacyKbConfig">>;
  beforeEach(() => {
    status = spyOn(manifest, "readKbManifestStatus").mockReturnValue({
      state: "ok",
    } as never);
    legacy = spyOn(config, "readLegacyKbConfig").mockReturnValue({
      kind: "none",
    } as never);
  });
  afterEach(() => {
    status.mockRestore();
    legacy.mockRestore();
  });

  type Options = {
    existing?: readonly string[] | "all";
    noFs?: boolean;
    prolog?: (goal: string) => Promise<unknown>;
  };
  function context(options: Options = {}) {
    const stats: string[] = [];
    const ctx = {
      workspaceRoot: "/ws",
      ...(options.noFs
        ? {}
        : {
            fs: {
              stat: async (target: string) => {
                stats.push(target);
                if (
                  options.existing === "all" ||
                  (options.existing ?? []).includes(target)
                )
                  return {};
                throw new Error("ENOENT");
              },
            },
          }),
      ...(options.prolog ? { prolog: { query: options.prolog } } : {}),
    } as unknown as OperationContext;
    return { ctx, stats };
  }

  describe("without a manifest", () => {
    beforeEach(() => {
      status.mockReturnValue({ state: "missing" } as never);
    });

    test("asks to migrate a legacy KB", async () => {
      legacy.mockReturnValue({ kind: "valid" } as never);
      expect(await classifyActivation(context().ctx)).toStrictEqual(
        legacyKbActivation(),
      );
      expect(legacy.mock.calls).toStrictEqual([["/ws"]]);
      expect(status.mock.calls).toStrictEqual([["/ws"]]);
    });

    test("tells vendored sources from a project", async () => {
      const { ctx, stats } = context();
      expect(
        await classifyActivation(ctx, ["kibi/src/a.ts", "kibi/README.md"]),
      ).toStrictEqual(VENDORED);
      expect(stats).toStrictEqual([
        "/ws/README.md",
        "/ws/package.json",
        "/ws/src",
        "/ws/app",
        "/ws/packages",
        "/ws/tests",
      ]);
      for (const file of [
        "README.md",
        "package.json",
        "src/a.ts",
        "app/a.ts",
        "packages/a/b.ts",
        "tests/a.ts",
        "/ws/src/a.ts",
      ])
        expect(
          await classifyActivation(context().ctx, ["kibi/x", file]),
        ).toStrictEqual(COLD);
      for (const file of ["docs/README.md", "xsrc/a.ts", "README.mdx"])
        expect(
          (await classifyActivation(context().ctx, ["kibi/x", file]))
            .activationState,
        ).toBe(file === "README.mdx" ? "root_uninitialized" : "vendored_only");
    });

    test("finds a project from its directories", async () => {
      for (const target of ["/ws/README.md", "/ws/tests"])
        expect(
          await classifyActivation(context({ existing: [target] }).ctx, [
            "kibi/x",
          ]),
        ).toStrictEqual(COLD);
      expect(
        await classifyActivation(context({ noFs: true }).ctx, ["kibi/x"]),
      ).toStrictEqual(COLD);
      expect(await classifyActivation(context().ctx)).toStrictEqual(COLD);
      expect(
        await classifyActivation(context().ctx, ["docs/a.md"]),
      ).toStrictEqual(COLD);
      expect(
        await classifyActivation(context().ctx, "x" as never),
      ).toStrictEqual(COLD);
    });
  });

  test("an invalid manifest is a partial root", async () => {
    status.mockReturnValue({ state: "invalid" } as never);
    expect(
      await classifyActivation(context({ existing: "all" }).ctx),
    ).toStrictEqual(PARTIAL);
  });

  test("a legacy config next to a manifest is not migrated", async () => {
    legacy.mockReturnValue({ kind: "valid" } as never);
    expect(
      await classifyActivation(context({ existing: "all" }).ctx),
    ).toStrictEqual(THIN);
  });

  test("a missing lane is a partial root", async () => {
    const lanes = [
      "/ws/.kb/requirements",
      "/ws/.kb/scenarios",
      "/ws/.kb/tests",
      "/ws/.kb/facts",
      "/ws/.kb/adr",
      "/ws/.kb/flags",
      "/ws/.kb/events",
      "/ws/.kb/symbols.yaml",
    ];
    const { ctx, stats } = context({ existing: lanes });
    expect(await classifyActivation(ctx)).toStrictEqual(THIN);
    expect([...stats].sort()).toStrictEqual([...lanes].sort());
    expect(
      await classifyActivation(context({ existing: lanes.slice(1) }).ctx),
    ).toStrictEqual(PARTIAL);
  });

  describe("without an engine", () => {
    const seededFiles = [
      ".kb/requirements/a.md",
      ".kb/requirements/b.MD",
      ".kb/scenarios/s.md",
      ".kb/facts/f.md",
      ".kb/flags/x.md",
    ];
    const classify = (files: string[]) =>
      classifyActivation(context({ existing: "all" }).ctx, files);

    test("counts authored lanes", async () => {
      expect(await classify(seededFiles)).toStrictEqual(SEEDED);
      expect(
        await classify(seededFiles.map((file) => `/ws/${file}`)),
      ).toStrictEqual(SEEDED);
      expect(
        await classify(seededFiles.map((file) => file.replaceAll("/", "\\"))),
      ).toStrictEqual(SEEDED);
      expect(await classify(seededFiles.slice(1))).toStrictEqual(THIN);
      expect(
        await classify([
          ".kb/Requirements/sub/long-name.md",
          ".kb/SCENARIOS/deep/dir/scenario.md",
          ".kb/facts/a-fact.md",
          ".kb/flags/flag-one.md",
          ".kb/events/event-one.md",
        ]),
      ).toStrictEqual(SEEDED);
      for (const odd of [
        "x/.kb/requirements/a.md",
        ".kb/requirements/a.md.bak",
        ".kb/requirements/.md",
      ])
        expect(
          await classify([
            odd,
            ".kb/scenarios/s.md",
            ".kb/facts/f.md",
            ".kb/flags/x.md",
            ".kb/events/e.md",
          ]),
        ).toStrictEqual(odd === ".kb/requirements/.md" ? SEEDED : THIN);
      expect(await classify(["src/a.ts"])).toStrictEqual(THIN);
    });

    test("counts each lane", async () => {
      const reqs = [".kb/requirements/a.md", ".kb/requirements/b.md"];
      for (const lane of ["scenarios", "tests", "adr", "adrs", "facts"])
        expect(
          (
            await classify([
              ...reqs,
              `.kb/${lane}/x.md`,
              ".kb/flags/f.md",
              ".kb/events/e.md",
            ])
          ).activationState,
        ).toBe("root_active_seeded");
      for (const lane of ["flags", "events"])
        expect(
          (
            await classify([
              ...reqs,
              `.kb/${lane}/x.md`,
              `.kb/${lane}/y.md`,
              ".kb/facts/f.md",
            ])
          ).activationState,
        ).toBe("root_active_seeded");
      expect(
        (
          await classify([
            ".kb/scenarios/a.md",
            ".kb/tests/a.md",
            ".kb/adr/a.md",
            ".kb/facts/a.md",
            ".kb/events/a.md",
          ])
        ).activationState,
      ).toBe("root_active_thin");
      expect(
        (
          await classify([
            ...reqs,
            ".kb/flags/a.md",
            ".kb/flags/b.md",
            ".kb/events/c.md",
          ])
        ).activationState,
      ).toBe("root_active_thin");
      expect(
        (
          await classify([
            ...reqs,
            ".kb/scenarios/a.txt",
            ".kb/flags/b.md",
            ".kb/events/c.md",
            "x/.kb/facts/a.md",
          ])
        ).activationState,
      ).toBe("root_active_thin");
    });
  });

  describe("with an engine", () => {
    const report = (rows: unknown) =>
      context({
        existing: "all",
        prolog: async (goal) => {
          expect(goal).toBe(
            "discovery:coverage_report_json(type, [], true, false, 100, 0, JsonString)",
          );
          if (rows instanceof Error) throw rows;
          return {
            bindings:
              rows === undefined ? {} : { JsonString: JSON.stringify(rows) },
          };
        },
      }).ctx;

    test("reads the coverage report", async () => {
      const rows = [
        { type: "req", count: 1 },
        { type: "fact", count: 1 },
        { type: "flag", count: 3 },
      ];
      expect(await classifyActivation(report({ rows }))).toStrictEqual(SEEDED);
      expect(
        await classifyActivation(report({ rows: rows.slice(1) }), [
          ".kb/requirements/a.md",
        ]),
      ).toStrictEqual(THIN);
      expect(
        await classifyActivation(
          report({
            rows: [
              { type: "req", count: 1 },
              { type: "fact", count: "1" },
              { type: 5, count: 1 },
              { count: 9 },
              "x",
              { type: "flag", count: 3 },
            ],
          }),
        ),
      ).toStrictEqual(THIN);
      expect(
        await classifyActivation(
          report({ rows: [...rows, { type: "symbol", count: 99 }] }),
        ),
      ).toStrictEqual(SEEDED);
    });

    test("reads a failed or malformed report as a thin KB", async () => {
      for (const rows of [
        new Error("engine"),
        undefined,
        null,
        {},
        { rows: { length: 1 } },
      ])
        expect(await classifyActivation(report(rows))).toStrictEqual(THIN);
    });
  });
});
