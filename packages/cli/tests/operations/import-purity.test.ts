import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as fs from "node:fs";

describe("operations import purity", () => {
  afterEach(() => {
    mock.restore();
  });

  test("imports without process, filesystem, subprocess, or signal side effects", async () => {
    const stdoutWrite = spyOn(process.stdout, "write").mockImplementation(
      () => true,
    );
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    const writeFileSync = spyOn(fs, "writeFileSync");
    const spawn = spyOn(Bun, "spawn");
    const exit = spyOn(process, "exit").mockImplementation(() => undefined as never);
    const on = spyOn(process, "on");
    const addListener = spyOn(process, "addListener");

    const operations = await import("kibi-cli/operations");

    expect(operations.OPERATION_CATALOG).toHaveLength(18);
    expect(stdoutWrite).not.toHaveBeenCalled();
    expect(stderrWrite).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(on).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();
  });
});
