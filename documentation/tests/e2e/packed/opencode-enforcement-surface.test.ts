import assert from "node:assert";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  createIsolatedInstall,
  installOpencodeTarball,
  resolveOpencodeTarball,
} from "./opencode-packed-utils.js";

const REPO_ROOT = resolve(process.cwd());

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type PostureModule = {
  detectPosture: (cwd: string) => {
    state: string;
    needsBootstrap: boolean;
    reason: string;
  };
};
type RiskModule = {
  classifyRisk: (params: {
    pathKind: string;
    isUnderKb: boolean;
    hasMustPriority: boolean;
    hasDurableComment: boolean;
    fileContent: string;
  }) => { riskClass: string; reasons: string[] };
};
type CacheModule = {
  getGuidanceCache: () => {
    isSatisfied: (key: Record<string, unknown>) => boolean;
    recordSatisfied: (key: Record<string, unknown>, preflightType: string) => void;
    invalidateForPosture: (posture: string) => void;
  };
  resetGuidanceCache: (ttlMs?: number, idleResetMs?: number) => void;
};
type EnforcementModule = {
  computeEffectiveMode: (inputs: {
    mode: string;
    requireRootKbForStrict: boolean;
    posture: string;
    maintenanceDegraded: boolean;
  }) => string;
};

/**
 * E2E: OpenCode smart enforcement through the installed plugin artifacts.
 *
 * Covers SCEN-opencode-posture-detection, SCEN-opencode-risk-classification,
 * SCEN-opencode-guidance-caching, and SCEN-opencode-smart-enforcement-v1-coverage
 * by importing the shipped dist modules of the packed kibi-opencode tarball —
 * the same artifacts the OpenCode loader imports.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: OpenCode enforcement surface", { timeout: 300000 }, () => {
    let tmpDir: string;
    let installDir: string;
    let posture: PostureModule;
    let risk: RiskModule;
    let cache: CacheModule;
    let enforcement: EnforcementModule;

    before(
      async () => {
        const { tarballPath } = resolveOpencodeTarball(REPO_ROOT);
        const isolated = createIsolatedInstall();
        tmpDir = isolated.tmpDir;
        installDir = isolated.installDir;
        installOpencodeTarball(installDir, tarballPath);

        const dist = join(installDir, "node_modules/kibi-opencode/dist");
        posture = (await import(join(dist, "repo-posture.js"))) as PostureModule;
        risk = (await import(join(dist, "risk-classifier.js"))) as RiskModule;
        cache = (await import(join(dist, "guidance-cache.js"))) as CacheModule;
        enforcement = (await import(
          join(dist, "smart-enforcement.js")
        )) as EnforcementModule;
      },
      { timeout: 240000 },
    );

    after(async () => {
      if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    });

    it(
      "detects repository posture states",
      { timeout: 60000 },
      async () => {
        const uninitialized = resolve(join(tmpDir, "posture-uninitialized"));
        mkdirSync(uninitialized, { recursive: true });
        const emptyResult = posture.detectPosture(uninitialized);
        assert.strictEqual(
          emptyResult.state,
          "root_uninitialized",
          `a workspace without any Kibi installation must be root_uninitialized: ${JSON.stringify(emptyResult)}`,
        );
        assert.strictEqual(emptyResult.needsBootstrap, true);

        const vendored = resolve(join(tmpDir, "posture-vendored"));
        mkdirSync(join(vendored, "kibi", ".kb"), { recursive: true });
        const vendoredResult = posture.detectPosture(vendored);
        assert.strictEqual(
          vendoredResult.state,
          "vendored_only",
          `a vendored kibi tree must be detected: ${JSON.stringify(vendoredResult)}`,
        );
      },
    );

    it(
      "classifies edit risk deterministically",
      { timeout: 60000 },
      () => {
        const requirementEdit = risk.classifyRisk({
          pathKind: "requirement",
          isUnderKb: true,
          hasMustPriority: true,
          hasDurableComment: false,
          fileContent: "# requirement",
        });
        assert.strictEqual(
          requirementEdit.riskClass,
          "req_policy_candidate",
          `requirement edits are policy candidates: ${JSON.stringify(requirementEdit)}`,
        );

        const manualKbEdit = risk.classifyRisk({
          pathKind: "kb",
          isUnderKb: true,
          hasMustPriority: false,
          hasDurableComment: false,
          fileContent: "{}",
        });
        assert.strictEqual(
          manualKbEdit.riskClass,
          "manual_kb_edit",
          `opaque .kb edits are manual: ${JSON.stringify(manualKbEdit)}`,
        );

        const testEdit = risk.classifyRisk({
          pathKind: "test",
          isUnderKb: false,
          hasMustPriority: false,
          hasDurableComment: false,
          fileContent: "test() {}",
        });
        assert.strictEqual(
          testEdit.riskClass,
          "safe_test_only",
          `test-only edits are safe: ${JSON.stringify(testEdit)}`,
        );
      },
    );

    it(
      "caches guidance per context and invalidates on posture change",
      { timeout: 60000 },
      () => {
        cache.resetGuidanceCache(600000);
        const guidance = cache.getGuidanceCache();
        const key = {
          workspaceRoot: "/tmp/e2e-opencode-workspace",
          branch: "develop",
          posture: "root_active",
          riskClass: "req_policy_candidate",
          fileBucket: ".kb/requirements",
        };
        assert.strictEqual(
          guidance.isSatisfied(key),
          false,
          "a fresh cache must not report satisfaction",
        );
        guidance.recordSatisfied(key, "preflight");
        assert.strictEqual(
          guidance.isSatisfied(key),
          true,
          "recording must satisfy the same context key",
        );
        guidance.invalidateForPosture("root_active");
        assert.strictEqual(
          guidance.isSatisfied(key),
          false,
          "posture invalidation must clear cached guidance",
        );
      },
    );

    it(
      "resolves the effective enforcement mode from posture and maintenance",
      { timeout: 60000 },
      () => {
        assert.strictEqual(
          enforcement.computeEffectiveMode({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_active",
            maintenanceDegraded: false,
          }),
          "strict",
          "an authoritative root posture earns strict enforcement",
        );
        assert.strictEqual(
          enforcement.computeEffectiveMode({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "vendored_only",
            maintenanceDegraded: false,
          }),
          "advisory",
          "non-authoritative postures stay advisory",
        );
        assert.strictEqual(
          enforcement.computeEffectiveMode({
            mode: "strict",
            requireRootKbForStrict: true,
            posture: "root_active",
            maintenanceDegraded: true,
          }),
          "advisory",
          "maintenance degradation forces advisory",
        );
        assert.strictEqual(
          enforcement.computeEffectiveMode({
            mode: "hard",
            requireRootKbForStrict: true,
            posture: "root_active",
            maintenanceDegraded: true,
          }),
          "hard",
          "hard mode persists for authoritative postures even while degraded",
        );
      },
    );
  });
}
