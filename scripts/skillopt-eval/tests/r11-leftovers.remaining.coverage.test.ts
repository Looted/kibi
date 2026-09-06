// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileBridge } from "../runtime/file-bridge";
import { HeldOutExecutionLeaseError } from "../held-out-execution-lease";
import { removeIfPresent } from "../held-out-receipt-io";
import { sha256Text } from "../fixtures/fixture-claim";
import { loadText } from "../cursor-operator";
import {
  factTarget,
  onlyDefinedSnapshot,
} from "../runtime/final-state";
import {
  nodeCommandOptions,
  startupFailureDetail,
} from "../runtime/canary-runtime";
import { defaultCanaryRun } from "../runtime/workspace";
import { redactEvidence } from "../scoring/evidence-utils";
import { unexpectedPredicateBindingReason } from "../scoring/predicate-evidence";
import { initialArtifactPathClosed } from "../artifact-path";
import { emptyIfEnoent } from "../runtime/codex-cell-artifacts";
import { falseIfEnoent } from "../runtime/codex-runtime";
import { assertMatchingSemanticClass } from "../fixtures/predicate-case-data";
import { intentIdentityDrifted, throwIfIntentDrift } from "../adoption-intent";
import { throwIfDirectoryInodeDrift } from "../adoption-lock";
import { throwIfTerminalMismatch } from "../adoption-journal";
import { throwIfIdentityDrift } from "../adoption-durable";
import { defaultPreflightDependencies } from "../legacy-preflight";
import { requireSkillFrontmatter } from "../offline-artifacts";
import { rethrowIfNotError, tryVerifyBundleSignature } from "../bundle-signature";
import { sandboxProbeFailureCode } from "../runtime/canary-probes";
import { loginRunForSource } from "../runtime/codex-optimizer";
import { throwIfBundleFailed } from "../runtime/staged-mcp";
import { coverageResultFromPriorCalls } from "../scoring/cell";
import {
  ConfigurationSchema,
  hasRoleKeyReuse,
} from "../runtime/fake-provider-contracts";
import { CLI_OPTIONS_MODULE } from "../cli-options";
import { PAID_LAUNCH_RECEIPTS_MODULE } from "../contracts/paid-launch-receipts";
import { TRUST_PLANE_MODULE } from "../contracts/trust-plane";

afterEach(() => {
  process.exitCode = 0;
});

describe("skillopt remasure11 leftover helpers", () => {
  test("covers extracted leftover helpers and constructors", async () => {
    expect(initialArtifactPathClosed()).toBe(false);
    const publicRoot = await mkdtemp(join(tmpdir(), "kibi-r11-pub-"));
    const privateRoot = await mkdtemp(join(tmpdir(), "kibi-r11-priv-"));
    const bridge = new FileBridge(publicRoot, privateRoot);
    expect(bridge.resolve("a.json", "public").startsWith(publicRoot)).toBe(true);

    expect(
      new HeldOutExecutionLeaseError("held_out_execution_lease_acquire_failed")
        .code,
    ).toBe("held_out_execution_lease_acquire_failed");

    const missing = join(publicRoot, "absent.txt");
    await removeIfPresent(missing);
    await expect(removeIfPresent(missing)).resolves.toBeUndefined();

    expect(sha256Text("abc")).toHaveLength(64);
    const note = join(publicRoot, "note.txt");
    await writeFile(note, "hello\n");
    expect(await loadText(note)).toBe("hello\n");

    expect(factTarget({ fact_kind: "observation" })).toBeNull();
    expect(factTarget({ fact_kind: "subject", subject_key: "user" })).toBe(
      "user",
    );
    expect(() => onlyDefinedSnapshot(undefined)).toThrow("malformed-snapshot");
    expect(onlyDefinedSnapshot({ ok: true })).toEqual({ ok: true });

    expect(nodeCommandOptions(undefined)).toEqual({});
    expect(nodeCommandOptions("node")).toEqual({ nodeCommand: "node" });
    expect(startupFailureDetail("nope")).toBe("unknown");
    expect(
      startupFailureDetail(Object.assign(new Error("denied"), { code: "EACCES" })),
    ).toBe("eacces");
    expect(startupFailureDetail(new TypeError("bad"))).toBe("typeerror");

    expect(redactEvidence(["secret-token", "safe"], ["secret-token"])).toEqual([
      "[REDACTED]",
      "safe",
    ]);
    expect(() => unexpectedPredicateBindingReason("nope")).toThrow(
      /unexpected predicate binding reason/,
    );
    const canary = await defaultCanaryRun(
      ["/bin/true"],
      process.cwd(),
      process.env,
      5_000,
    );
    expect(canary.exitCode).toBe(0);
    expect(CLI_OPTIONS_MODULE).toBe(true);
    expect(PAID_LAUNCH_RECEIPTS_MODULE).toBe(true);
    expect(TRUST_PLANE_MODULE).toBe(true);
    expect(
      emptyIfEnoent(Object.assign(new Error("missing"), { code: "ENOENT" })),
    ).toBe("");
    expect(emptyIfEnoent(new Error("boom"))).toBeUndefined();
    expect(
      falseIfEnoent(Object.assign(new Error("missing"), { code: "ENOENT" })),
    ).toBe(true);
    expect(falseIfEnoent(new Error("boom"))).toBe(false);
    expect(() =>
      assertMatchingSemanticClass("wrong-graph" as never, "mixed-snapshot" as never),
    ).toThrow("semantic class mismatch");
    expect(() => throwIfIntentDrift(true)).toThrow(
      "adoption no-replace intent drift",
    );
    throwIfIntentDrift(false);
    const matchingStat = {
      isSymbolicLink: () => false,
      isFile: () => true,
      dev: 1,
      ino: 2,
      nlink: 2,
    };
    expect(
      intentIdentityDrifted(matchingStat, matchingStat, {
        dev: "1",
        ino: "2",
        hash: "abc",
      }, "abc"),
    ).toBe(false);
    expect(
      intentIdentityDrifted(matchingStat, matchingStat, {
        dev: "1",
        ino: "2",
        hash: "abc",
      }, "drifted"),
    ).toBe(true);
    expect(() =>
      throwIfDirectoryInodeDrift({ dev: 1, ino: 2 }, { dev: 1, ino: 3 }),
    ).toThrow("adoption .kibi directory inode drift");
    throwIfDirectoryInodeDrift({ dev: 1, ino: 2 }, { dev: 1, ino: 2 });
    expect(() => throwIfTerminalMismatch(false, false)).toThrow(
      "adoption terminal mismatch",
    );
    throwIfTerminalMismatch(true, false);
    throwIfTerminalMismatch(false, true);
    expect(() => throwIfIdentityDrift(false)).toThrow(
      "adoption file inode drift",
    );
    throwIfIdentityDrift(true);
    expect(typeof defaultPreflightDependencies.probeSandbox).toBe("function");
    const preflightRun = await defaultPreflightDependencies.run(
      ["/bin/true"],
      process.cwd(),
      process.env,
      5_000,
    );
    expect(preflightRun.exitCode).toBe(0);
    expect(tryVerifyBundleSignature({}, "not-a-key", "Zg==")).toBe(false);
    expect(() => requireSkillFrontmatter("no frontmatter")).toThrow(
      "offline_skill_frontmatter_missing",
    );
    requireSkillFrontmatter("---\nname: x\n---\nbody\n");
    expect(() => rethrowIfNotError("nope")).toThrow("nope");
    rethrowIfNotError(new Error("ignored"));
    expect(sandboxProbeFailureCode(true)).toBe("source_isolation_probe_failed");
    expect(sandboxProbeFailureCode(false)).toBe("sandbox_probe_failed");
    const loginRun = await loginRunForSource(process.cwd())(
      ["/bin/true"],
      process.env,
    );
    expect(loginRun.exitCode).toBe(0);
    expect(() => throwIfBundleFailed(false)).toThrow("bundle_failed");
    throwIfBundleFailed(true);
    expect(
      coverageResultFromPriorCalls(
        [
          { tool: "kb_coverage", args: {}, resultOk: true, result: { ok: 1 } },
          { tool: "kb_apply_plan", args: {}, resultOk: true },
        ],
        1,
      ),
    ).toEqual({ ok: 1 });
    expect(coverageResultFromPriorCalls([], 0)).toBeNull();
    expect(hasRoleKeyReuse("a", "a")).toBe(true);
    expect(hasRoleKeyReuse("a", "b")).toBe(false);
    const reusedHash = "a".repeat(64);
    expect(
      ConfigurationSchema.safeParse({
        parentId: "00000000-0000-4000-8000-000000000001",
        parentHash: reusedHash,
        authorizationMicrousd: 0,
        maxRequests: 1,
        pricingHash: reusedHash,
        providerKeyId: "same",
        verifierKeyId: "same",
        destination: {
          scheme: "https",
          host: "example.com",
          port: 443,
          sni: "example.com",
          pinnedIps: ["1.2.3.4"],
          selectedIp: "1.2.3.4",
          caDigest: reusedHash,
          redirects: false,
          proxies: false,
          tunnels: false,
        },
        ceilings: {
          models: ["gpt-5.4-mini"],
          maxInputTokens: 1,
          maxOutputTokens: 1,
          maxRetries: 0,
          timeoutMs: 1,
          maxChargeMicrousd: 1,
        },
      }).success,
    ).toBe(false);
  });
});
