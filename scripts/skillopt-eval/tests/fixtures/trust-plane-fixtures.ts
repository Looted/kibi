import { JsonValueSchema, contractHash } from "../../contracts/common";

export const fixtureHash = (character: string): string => character.repeat(64);

export const rootAuthorizationFixture = {
  schemaVersion: "1.0.0",
  protocolVersion: "kibi-skillopt-trust-v1",
  artifactType: "immutable-root-authorization",
  authorizationId: "00000000-0000-4000-8000-000000000501",
  immutableRoots: {
    corpus: fixtureHash("a"),
    evaluator: fixtureHash("b"),
    querySet: fixtureHash("c"),
    baseline: fixtureHash("d"),
    verifierRelease: fixtureHash("e"),
    artifactSchema: fixtureHash("f"),
  },
  rootAuthority: {
    keyId: "root-authority-v1",
    signature: fixtureHash("1"),
  },
};

export const supervisorParentFixture = {
  schemaVersion: "1.0.0",
  protocolVersion: "kibi-skillopt-trust-v1",
  artifactType: "supervisor-run-parent",
  parentId: "00000000-0000-4000-8000-000000000502",
  rootAuthorizationHash: contractHash(
    JsonValueSchema.parse(rootAuthorizationFixture),
  ),
  sourceRoot: fixtureHash("3"),
  candidateHashes: {
    baseline: fixtureHash("4"),
    oneShot: fixtureHash("5"),
    skillopt: fixtureHash("6"),
  },
  invocationHash: fixtureHash("7"),
  matrixId: "00000000-0000-4000-8000-000000000503",
  artifactSchemaDigest: fixtureHash("f"),
  ceilings: {
    totalMicrousd: 2000,
    maxRequests: 2,
    models: ["gpt-5.4-mini", "gpt-5.5"],
    maxInputTokens: 1000,
    maxOutputTokens: 200,
    maxRetries: 1,
    timeoutMs: 5000,
  },
  pricing: {
    currency: "USD-microusd",
    inputPerMillionTokensMicrousd: 1000,
    outputPerMillionTokensMicrousd: 2000,
    pricingHash: fixtureHash("8"),
  },
  providerSupervisor: {
    keyId: "provider-supervisor-v1",
    signature: fixtureHash("9"),
  },
};

export const launcherSessionFixture = {
  schemaVersion: "1.0.0",
  protocolVersion: "kibi-skillopt-trust-v1",
  artifactType: "launcher-session",
  peer: {
    role: "provider-supervisor",
    uid: 61101,
    pid: 4401,
    keyId: "provider-supervisor-v1",
  },
  descriptors: {
    controlSocketFd: 3,
    servicePidfd: 4,
    sealedAuthorizationFd: 5,
    sealedSnapshotArtifactFd: 6,
  },
  connectedSocket: true,
  pidfdAuthenticated: true,
  authorizationSeals: ["seal-grow", "seal-shrink", "seal-write", "seal-seal"],
};
