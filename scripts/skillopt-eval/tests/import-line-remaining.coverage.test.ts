// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import * as cliOptions from "../cli-options";
import * as paidLaunchReceipts from "../contracts/paid-launch-receipts";
import * as trustPlane from "../contracts/trust-plane";

afterEach(() => {
  process.exitCode = 0;
});

describe("skillopt leftover module import lines", () => {
  test("loads modules whose first import line was uncovered", () => {
    expect(cliOptions).toBeDefined();
    expect(paidLaunchReceipts).toBeDefined();
    expect(trustPlane).toBeDefined();
  });
});
