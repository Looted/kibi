import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { executePrepareImpactReview } from "../../../src/public/operations/impact-review-preparation.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as snapshots from "../../../src/traceability/git-change-snapshot.js";
import * as evaluator from "../../../src/traceability/impact-evaluator.js";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function repo() {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-prep-cov-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  git("init", "-q");
  git("config", "user.name", "Impact Fixture");
  git("config", "user.email", "impact-fixture@example.invalid");
  write(
    ".kibi/impact-policy.json",
    `${JSON.stringify({
      contractVersion: "kibi.impact-policy.v1",
      id: "fixture-policy",
      version: "1",
      allowUnsupportedReview: true,
      allowedPartial: [],
      notApplicablePaths: [],
    })}\n`,
  );
  write("src/service.ts", "export function run() { return 1; }\n");
  write("src/other.ts", "export function other() { return 1; }\n");
  git("add", ".");
  git("commit", "-qm", "baseline");
  write("src/service.ts", "export function run() { return 2; }\n");
  write("src/other.ts", "export function other() { return 2; }\n");
  git("add", ".");
  return { root, git };
}

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(0),
  } as unknown as OperationContext;
}

type Prepared = ReturnType<typeof evaluator.prepareImpactReview>;

function withPartialAnalysis(
  allowed: readonly { diagnosticCode: string; limitationClass: string }[],
) {
  const real = evaluator.prepareImpactReview;
  const spy = spyOn(evaluator, "prepareImpactReview").mockImplementation(
    (...args: Parameters<typeof real>) => {
      const prepared = real(...args) as Prepared;
      const analysis = prepared.files[0]?.after?.analysis;
      if (!analysis) throw new Error("fixture has no after analysis");
      return {
        ...prepared,
        policy: {
          ...prepared.policy,
          allowedPartial: allowed.map((entry) => ({
            providerId: analysis.providerId,
            providerFingerprint: analysis.providerFingerprint,
            ...entry,
          })),
        },
        files: prepared.files.map((file) => ({
          ...file,
          after: {
            ...file.after,
            analysis: {
              ...file.after?.analysis,
              status: "partial",
              diagnosticCodes: ["dynamic_decorator", "dynamic_member"],
              uncoveredRanges: [
                { startLine: 1, endLine: 1, reason: "dynamic decorator" },
              ],
            },
          },
        })),
      } as Prepared;
    },
  );
  spies.push(spy);
}

describe("executePrepareImpactReview residual obligations", () => {
  test("a partial analysis the policy allows becomes a pending partial review", async () => {
    const { root } = repo();
    withPartialAnalysis([
      { diagnosticCode: "dynamic_decorator", limitationClass: "dynamic-code" },
    ]);
    const result = await executePrepareImpactReview(
      { scope: { kind: "staged" } },
      context(root),
    );
    const data = result.structuredContent as Record<string, unknown>;
    expect(data.residualReviewObligations).toStrictEqual([
      {
        path: "src/other.ts",
        side: "after",
        status: "partial",
        diagnosticCodes: ["dynamic_decorator", "dynamic_member"],
        kind: "partial_review",
        limitationClass: "dynamic-code",
        ranges: [{ startLine: 1, endLine: 1, reason: "dynamic decorator" }],
        pending: true,
      },
      {
        path: "src/service.ts",
        side: "after",
        status: "partial",
        diagnosticCodes: ["dynamic_decorator", "dynamic_member"],
        kind: "partial_review",
        limitationClass: "dynamic-code",
        ranges: [{ startLine: 1, endLine: 1, reason: "dynamic decorator" }],
        pending: true,
      },
    ]);
  });

  test("a partial analysis with no single allowed limitation class is refused", async () => {
    const { root } = repo();
    withPartialAnalysis([]);
    await expect(
      executePrepareImpactReview({ scope: { kind: "staged" } }, context(root)),
    ).rejects.toThrow(
      "Partial review obligation is not covered by the trusted policy: src/other.ts (after)",
    );
  });
});

describe("executePrepareImpactReview identity checks", () => {
  test("a diff whose trees changed while preparing is refused", async () => {
    const { root, git } = repo();
    git("commit", "-qm", "change");
    const head = git("rev-parse", "HEAD");
    const base = git("rev-parse", "HEAD~1");
    const real = snapshots.captureDiffSnapshot;
    const spy = spyOn(snapshots, "captureDiffSnapshot").mockImplementation(
      (...args: Parameters<typeof real>) => ({
        ...real(...args),
        baseTree: "0".repeat(40),
      }),
    );
    spies.push(spy);
    await expect(
      executePrepareImpactReview(
        { scope: { kind: "diff", baseCommit: base, headCommit: head } },
        context(root),
      ),
    ).rejects.toThrow(
      "Selected diff commit or tree identity changed during impact review preparation",
    );
  });

  test("an evaluator closure that changes while preparing is refused", async () => {
    const { root } = repo();
    let calls = 0;
    const spy = spyOn(
      evaluator,
      "fingerprintImpactEvaluator",
    ).mockImplementation(() => `sha256:${String(calls++ % 10).repeat(64)}`);
    spies.push(spy);
    await expect(
      executePrepareImpactReview({ scope: { kind: "staged" } }, context(root)),
    ).rejects.toThrow(
      "Trusted source-provider or impact-evaluator closure changed during impact review preparation",
    );
  });
});
