import { expect, mock, test } from "bun:test";
import type { PathLike } from "node:fs";
import fastGlob from "fast-glob";
import {
  cleanupAbandonedStagingDirectories,
  prepareStagingEnvironment,
} from "../../../src/commands/sync/staging.js";

test("cleanupAbandonedStagingDirectories removes dead process staging directories with default liveness check", async () => {
  const stalePath = "/repo/.kb/branches/main.staging.999999999.1000";
  const existsSync = mock((value: PathLike) => value === stalePath);
  const fg = Object.assign(
    mock(async () => [stalePath]),
    fastGlob,
  );
  const rmSync = mock((_value: PathLike, _options?: unknown) => undefined);

  await cleanupAbandonedStagingDirectories(
    "/repo/.kb/branches/main.staging.12345.2000",
    { existsSync, fg, rmSync },
  );

  expect(rmSync).toHaveBeenCalledWith(stalePath, {
    recursive: true,
    force: true,
  });
});

test("cleanupAbandonedStagingDirectories escapes branch names when matching candidates", async () => {
  const stalePath = "/repo/.kb/branches/feature+a.staging.111.1000";
  const otherPath = "/repo/.kb/branches/featurexa.staging.222.1000";
  const existsSync = mock((value: PathLike) => value === stalePath);
  const fg = Object.assign(
    mock(async () => [stalePath, otherPath]),
    fastGlob,
  );
  const rmSync = mock((_value: PathLike, _options?: unknown) => undefined);

  await cleanupAbandonedStagingDirectories(
    "/repo/.kb/branches/feature+a.staging.333.2000",
    {
      existsSync,
      fg,
      isProcessAlive: () => false,
      rmSync,
    },
  );

  expect(rmSync).toHaveBeenCalledTimes(1);
  expect(rmSync).toHaveBeenCalledWith(stalePath, {
    recursive: true,
    force: true,
  });
});

test("prepareStagingEnvironment uses process cwd when cwd dependency is not overridden", async () => {
  const originalCwd = process.cwd;
  const cwd = mock(() => "/repo/from-process");
  const existsSync = mock((_value: PathLike) => false);
  const mkdirSync = mock((_value: PathLike, _options?: unknown) => undefined);
  const rmSync = mock((_value: PathLike, _options?: unknown) => undefined);
  process.cwd = cwd;

  try {
    await prepareStagingEnvironment("/staging", "/live", true, {
      existsSync,
      fg: fastGlob,
      mkdirSync,
      rmSync,
    });
  } finally {
    process.cwd = originalCwd;
  }

  expect(cwd).toHaveBeenCalled();
  expect(existsSync).toHaveBeenCalledWith(
    "/repo/from-process/node_modules/kibi-cli/schema",
  );
});
