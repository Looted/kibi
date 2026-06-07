/**
 * Pure helper for resolving the KIBI_RELEASE_MOCK_NPM environment contract.
 *
 * - `undefined` → live-npm mode (query the real registry)
 * - defined (including empty string) → fixture mode with a parsed published-package set
 *
 * @module release-runner-fixture
 */

export interface NpmFixtureLive {
  mode: "live";
}

export interface NpmFixtureMock {
  mode: "fixture";
  /** Set of "pkg@version" strings considered already published. */
  published: Set<string>;
}

export type NpmFixtureResult = NpmFixtureLive | NpmFixtureMock;

/**
 * Resolve the npm fixture from the raw environment value.
 *
 * @param envValue - Raw value of `process.env.KIBI_RELEASE_MOCK_NPM`
 *   (or `undefined` if unset).
 * @returns Live mode when absent; fixture mode with a (possibly empty)
 *   set of trimmed `pkg@version` tokens when present.
 */
export function resolveNpmFixture(
  envValue: string | undefined,
): NpmFixtureResult {
  // implements REQ-020
  if (envValue === undefined) {
    return { mode: "live" };
  }

  const published = new Set(
    envValue
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );

  return { mode: "fixture", published };
}
