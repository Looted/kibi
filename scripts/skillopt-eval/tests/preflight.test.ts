import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { createPreflightFixture, invokePreflight } from "./preflight-fixture";
import { ResultSchema } from "./preflight-result";
import { unsupportedCases } from "./preflight-unsupported-cases";

const roots: string[] = [];
setDefaultTimeout(15_000);

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("SkillOpt trust-plane preflight", () => {
  test("preflight accepts qualified host", async () => {
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    const result = await invokePreflight(fixture);
    expect(result.exitCode).toBe(0);
    const receipt = ResultSchema.parse(result.output);
    expect(receipt.status).toBe("qualified");
    expect(receipt.code).toBe("OK");
    expect(
      Object.values(receipt.lockDigests).every((digest) =>
        /^[a-f0-9]{64}$/.test(digest),
      ),
    ).toBe(true);
    expect(receipt.checks.length).toBeGreaterThanOrEqual(18);
  });

  test("preflight rejects every unsupported primitive before spawn", async () => {
    const results = [];
    for (const testCase of unsupportedCases) {
      const fixture = await createPreflightFixture();
      roots.push(fixture.root);
      await testCase.mutate(fixture);
      results.push({
        testCase,
        fixture,
        result: await invokePreflight(fixture),
      });
    }
    for (const { testCase, fixture, result } of results) {
      expect(result.exitCode, testCase.name).not.toBe(0);
      const receipt = ResultSchema.parse(result.output);
      expect(
        receipt.reasons.map((reason) => reason.check),
        testCase.name,
      ).toContain(testCase.check);
      expect(
        await readFile(fixture.sentinel, "utf8").catch(() => ""),
        testCase.name,
      ).toBe("");
    }
  });
});
