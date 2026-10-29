import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CI_ENV_KEYS,
  DEFAULT_TELEMETRY_HOST,
  TEST_ENV_KEYS,
} from "../../../../agent-core/src/usage-telemetry.js";

// implements REQ-kibi-telemetry-automation-keys

/**
 * Where anonymous usage statistics go by default, and the environment variables that mark a run as automated so it stays silent. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The default telemetry endpoint shall be https://eu.i.posthog.com. */
export function telemetryDefaultHostCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-telemetry-default-host",
    symbolId: "SYM-const-default-telemetry-host",
    value: DEFAULT_TELEMETRY_HOST,
  });
}

/** A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds. */
export async function telemetryCiEnvKeysCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-telemetry-ci-env-keys",
    domain: { symbolId: "SYM-const-ci-env-keys", members: [...CI_ENV_KEYS] },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT. */
export async function telemetryTestEnvKeysCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-telemetry-test-env-keys",
    domain: {
      symbolId: "SYM-const-test-env-keys",
      members: [...TEST_ENV_KEYS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Telemetry endpoint and automation detection keys", () => {
  test("The default telemetry endpoint shall be https://eu.i.posthog.com", () => {
    writeCodeCertificate(telemetryDefaultHostCertificate());
    expect(DEFAULT_TELEMETRY_HOST).toBe("https://eu.i.posthog.com");
  });

  test("A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds", async () => {
    writeCodeCertificate(await telemetryCiEnvKeysCertificate());
    expect([...CI_ENV_KEYS].sort()).toEqual([
      "APPVEYOR",
      "BITBUCKET_BUILD_NUMBER",
      "BUILDKITE",
      "BUILDKITE_BUILD_ID",
      "CF_BUILD_ID",
      "CI",
      "CIRCLECI",
      "CODEBUILD_BUILD_ID",
      "CONTINUOUS_INTEGRATION",
      "DRONE",
      "GITHUB_ACTIONS",
      "GITLAB_CI",
      "HEROKU_TEST_RUN_ID",
      "JENKINS_URL",
      "SEMAPHORE",
      "TEAMCITY_VERSION",
      "TF_BUILD",
      "TRAVIS",
    ]);
  });

  test("A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT", async () => {
    writeCodeCertificate(await telemetryTestEnvKeysCertificate());
    expect([...TEST_ENV_KEYS].sort()).toEqual([
      "JEST_WORKER_ID",
      "NODE_ENV=test",
      "NODE_TEST_CONTEXT",
      "VITEST",
      "VITEST_WORKER_ID",
    ]);
  });
});
