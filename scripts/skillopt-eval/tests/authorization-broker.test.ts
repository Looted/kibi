import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonValueSchema, contractHash } from "../contracts/common";
import {
  parseGeneratedArtifactReceipt,
  parseLauncherSession,
  parseRootAuthorization,
  parseSupervisorParent,
} from "../contracts/trust-plane";
import {
  EXTERNAL_PROVISIONING_COMMAND,
  ExternalPrerequisiteMissingError,
  requireExternalTrustPlane,
} from "../runtime/external-trust-client";
import { REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import {
  fixtureHash as hash,
  launcherSessionFixture as launcherSession,
  rootAuthorizationFixture as rootAuthorization,
  supervisorParentFixture as supervisorParent,
} from "./fixtures/trust-plane-fixtures";

describe("trusted broker authorization contracts", () => {
  test("isolates predicate tools on the evaluator broker allowlist", () => {
    // Given
    const predicateTools = [
      "kb_semantic_advisor",
      "kb_suggest_predicates",
      "kb_model_requirement",
      "kb_validate_upsert",
    ];
    const allowlist = new Set<string>(REQUIRED_KIBI_TOOLS);

    // When
    const exposed = predicateTools.every((tool) => allowlist.has(tool));

    // Then
    expect(exposed).toBe(true);
    // Deletion is brokered and protocol-scored per task: the allowlist
    // exposes kb_delete, while each private manifest forbids it except on
    // deletion-sanctioned objectives.
    expect(allowlist.has("kb_delete")).toBe(true);
  });

  test("separates immutable Root Authority scope from supervisor run scope", () => {
    // Given
    const root = parseRootAuthorization(rootAuthorization);

    // When
    const parent = parseSupervisorParent(supervisorParent, root);

    // Then
    expect(Object.keys(root.immutableRoots).sort()).toEqual([
      "artifactSchema",
      "baseline",
      "corpus",
      "evaluator",
      "querySet",
      "verifierRelease",
    ]);
    expect(parent.sourceRoot).toBe(hash("3"));
    expect(parent.providerSupervisor.keyId).not.toBe(root.rootAuthority.keyId);
  });

  test("rejects role crossing and stale immutable bindings", () => {
    // Given
    const crossed = {
      ...supervisorParent,
      providerSupervisor: {
        ...supervisorParent.providerSupervisor,
        keyId: rootAuthorization.rootAuthority.keyId,
      },
    };
    const stale = { ...supervisorParent, artifactSchemaDigest: hash("0") };
    const mutatedRoot = {
      ...rootAuthorization,
      immutableRoots: {
        ...rootAuthorization.immutableRoots,
        corpus: hash("0"),
      },
    };
    const root = parseRootAuthorization(rootAuthorization);

    // When
    const parseCrossed = () => parseSupervisorParent(crossed, root);
    const parseStale = () => parseSupervisorParent(stale, root);
    const parseMutatedRoot = () =>
      parseSupervisorParent(
        supervisorParent,
        parseRootAuthorization(mutatedRoot),
      );

    // Then
    expect(parseCrossed).toThrow("role_key_reuse");
    expect(parseStale).toThrow("immutable_root_mismatch");
    expect(parseMutatedRoot).toThrow("immutable_root_mismatch");
  });

  test("requires connected socket pidfd peer identity and frozen FD inventory", () => {
    // Given
    const valid = parseLauncherSession(launcherSession);
    const invalid = {
      ...launcherSession,
      connectedSocket: false,
      descriptors: { ...launcherSession.descriptors, servicePidfd: 3 },
    };

    // When
    const parseInvalid = () => parseLauncherSession(invalid);

    // Then
    expect(valid.descriptors).toEqual({
      controlSocketFd: 3,
      servicePidfd: 4,
      sealedAuthorizationFd: 5,
      sealedSnapshotArtifactFd: 6,
    });
    expect(parseInvalid).toThrow();
  });

  test("chains generated artifact receipts without claiming immutable-root identity", () => {
    // Given
    const root = parseRootAuthorization(rootAuthorization);
    const parent = parseSupervisorParent(supervisorParent, root);
    const generated = {
      schemaVersion: "1.0.0",
      protocolVersion: "kibi-skillopt-trust-v1",
      artifactType: "generated-artifact-receipt",
      parentHash: contractHash(JsonValueSchema.parse(parent)),
      generatedArtifactRoot: hash("0"),
      authorizationMicrousd: 0,
      evaluator: { keyId: "evaluator-v1", signature: hash("a") },
      verifier: { keyId: "verifier-v1", signature: hash("b") },
    };

    // When
    const receipt = parseGeneratedArtifactReceipt(generated, root, parent);

    // Then
    expect(receipt.generatedArtifactRoot).not.toBe(root.immutableRoots.corpus);
    expect(receipt.authorizationMicrousd).toBe(0);
    expect(
      new Set([
        root.rootAuthority.keyId,
        parent.providerSupervisor.keyId,
        receipt.evaluator.keyId,
        receipt.verifier.keyId,
      ]).size,
    ).toBe(4);
  });

  test("fails closed with the exact provisioning handoff before launch", async () => {
    // Given
    const observed: string[] = [];

    // When
    const attempt = requireExternalTrustPlane({
      isReadable: async (path) => {
        observed.push(path);
        return false;
      },
    });

    // Then
    await expect(attempt).rejects.toBeInstanceOf(
      ExternalPrerequisiteMissingError,
    );
    await expect(attempt).rejects.toMatchObject({
      code: "EXTERNAL_PREREQUISITE_MISSING",
      installerCommand: EXTERNAL_PROVISIONING_COMMAND,
    });
    expect(observed).toEqual([
      "/usr/libexec/kibi-skillopt-verifier-launch",
      "/etc/kibi-skillopt/verifier-bundle.lock",
      "/etc/kibi-skillopt/authorizations/predicate-roots.jcs",
    ]);
  });

  test("exits nonzero before process provider or ledger activity when services are absent", async () => {
    // Given
    const fixtureRoot = await mkdtemp(
      join(tmpdir(), "skillopt-trust-missing-"),
    );
    const cli = join(
      import.meta.dir,
      "../runtime/external-trust-client-cli.ts",
    );

    try {
      // When
      const child = Bun.spawn(
        [process.execPath, cli, "--fixture-root", fixtureRoot],
        {
          cwd: process.cwd(),
          env: { ...process.env, KIBI_SKILLOPT_TEST_FIXTURE: "1" },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [exitCode, stderr] = await Promise.all([
        child.exited,
        new Response(child.stderr).text(),
      ]);

      // Then
      expect(exitCode).not.toBe(0);
      expect(JSON.parse(stderr)).toMatchObject({
        code: "EXTERNAL_PREREQUISITE_MISSING",
        installerCommand: EXTERNAL_PROVISIONING_COMMAND,
        processSpawned: false,
        providerContacted: false,
        ledgerWritten: false,
      });
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects malformed external contracts without preserving unknown fields", () => {
    // Given
    const malformed = {
      ...rootAuthorization,
      sourceRoot: hash("3"),
      immutableRoots: {
        ...rootAuthorization.immutableRoots,
        corpus: "invalid",
      },
    };

    // When
    const parse = () => parseRootAuthorization(malformed);

    // Then
    expect(parse).toThrow();
  });
});
