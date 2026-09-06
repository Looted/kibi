// implements REQ-kibi-distribution-parity-matrix
import { afterEach, describe, expect, test } from "bun:test";
import {
  defaultVerifyPublishExit,
  runVerifyPublishMetadataIfMain,
} from "../verify-publish-metadata.ts";

afterEach(() => {
  process.exitCode = 0;
});

describe("verify-publish-metadata leftover main gate", () => {
  test("runVerifyPublishMetadataIfMain exits only when invoked as main", () => {
    const exits: number[] = [];
    runVerifyPublishMetadataIfMain(false, () => 7, (code) => {
      exits.push(code);
    });
    expect(exits).toEqual([]);
    runVerifyPublishMetadataIfMain(true, () => 3, (code) => {
      exits.push(code);
    });
    expect(exits).toEqual([3]);
    runVerifyPublishMetadataIfMain(false, () => 0);
    const exit = process.exit;
    const codes: number[] = [];
    process.exit = ((code?: number) => {
      codes.push(code ?? 0);
    }) as typeof process.exit;
    try {
      defaultVerifyPublishExit(2);
    } finally {
      process.exit = exit;
    }
    expect(codes).toEqual([2]);
  });
});
