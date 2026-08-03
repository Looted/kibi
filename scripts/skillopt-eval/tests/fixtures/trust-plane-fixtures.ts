import { JsonValueSchema, contractHash } from "../../contracts/common";
import { fixtureReceiptSignature } from "../../contracts/paid-launch-receipts";

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
    models: ["gpt-5.4-mini", "gpt-5.6-sol"],
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

const launchBinding = {
  requestId: "request-fixture-1",
  requestHash: fixtureHash("b"),
  parentHash: fixtureHash("c"),
  capabilityId: fixtureHash("d"),
  invoiceId: "invoice-fixture-1",
  usageHash: fixtureHash("e"),
  pricingHash: fixtureHash("f"),
  model: "gpt-5.6-sol" as const,
  leaseId: "00000000-0000-4000-8000-000000000504",
};

const unsignedDebitSubentryReceipt = {
  schemaVersion: "1.0.0",
  artifactType: "provider-debit-subentry-receipt",
  launchBinding,
  chargedMicrousd: 800,
  signer: {
    role: "provider-supervisor",
    keyId: "provider-supervisor-fixture-v1",
    signatureAlgorithm: "fixture-sha256-digest",
    signatureProvenance: "deterministic-test-fixture",
    externallySigned: false,
  },
} as const;

export const debitSubentryReceiptFixture = {
  ...unsignedDebitSubentryReceipt,
  signer: {
    ...unsignedDebitSubentryReceipt.signer,
    signature: fixtureReceiptSignature(unsignedDebitSubentryReceipt),
  },
};

const unsignedFinalDebitReceipt = {
  schemaVersion: "1.0.0",
  artifactType: "final-debit-reconciliation-receipt",
  parentHash: launchBinding.parentHash,
  debitSubentryHashes: [
    contractHash(JsonValueSchema.parse(debitSubentryReceiptFixture)),
  ],
  launchBindings: [launchBinding],
  authorizationMicrousd: 2000,
  totalChargedMicrousd: 800,
  remainingMicrousd: 1200,
  reconciled: true,
  signer: {
    role: "ledger-reconciler",
    keyId: "ledger-reconciler-fixture-v1",
    signatureAlgorithm: "fixture-sha256-digest",
    signatureProvenance: "deterministic-test-fixture",
    externallySigned: false,
  },
} as const;

export const finalDebitReceiptFixture = {
  ...unsignedFinalDebitReceipt,
  signer: {
    ...unsignedFinalDebitReceipt.signer,
    signature: fixtureReceiptSignature(unsignedFinalDebitReceipt),
  },
};

const unsignedFinalVerdictReceipt = {
  schemaVersion: "1.0.0",
  artifactType: "final-verdict-receipt",
  parentHash: launchBinding.parentHash,
  finalDebitReceiptHash: contractHash(
    JsonValueSchema.parse(finalDebitReceiptFixture),
  ),
  launchBindings: [launchBinding],
  evidenceRootHash: fixtureHash("a"),
  verdict: "pass",
  reasons: [],
  signer: {
    role: "verifier",
    keyId: "verifier-fixture-v1",
    signatureAlgorithm: "fixture-sha256-digest",
    signatureProvenance: "deterministic-test-fixture",
    externallySigned: false,
  },
} as const;

export const finalVerdictReceiptFixture = {
  ...unsignedFinalVerdictReceipt,
  signer: {
    ...unsignedFinalVerdictReceipt.signer,
    signature: fixtureReceiptSignature(unsignedFinalVerdictReceipt),
  },
};
