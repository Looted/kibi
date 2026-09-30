// executable_for TEST-prolog-doctor-runtime-report
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { doctorCommand } from "../../src/commands/doctor.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { resetKibiEnvironmentBootstrapStateForTests } from "../../src/env/bootstrap.js";
import { type FakeSwiplSpec, installFakeSwipl } from "../helpers/fake-swipl.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

interface DoctorCheckResult {
  name: string;
  passed: boolean;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

interface DoctorPayload {
  checks: DoctorCheckResult[];
}

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  resetKibiEnvironmentBootstrapStateForTests();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Doctor fixtures do not always start an engine.
    }
    removeTempDir(root);
  }
  process.exitCode = 0;
});

function mockSwipl(spec: FakeSwiplSpec): void {
  restores.push(installFakeSwipl(spec));
}

function preparedWorkspace(): string {
  restores.push(isolateKibiEnv());
  mockSwipl("SWI-Prolog version 9.2 (threaded, 64 bits)\n");
  const cwd = fs.realpathSync.native(createGitWorkspace());
  roots.push(cwd);
  return cwd;
}

function writeOkManifest(cwd: string): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 5,
      semanticAdvisorBackfill: "not_applicable",
    }),
  );
}

async function runDoctorJson(
  cwd: string,
): Promise<{ exitCode: number; payload: DoctorPayload }> {
  const io = captureIo();
  restores.push(io.restore);
  const result = await withCwd(cwd, () => doctorCommand({ format: "json" }));
  const payload = JSON.parse(io.logs[0] ?? io.logText()) as DoctorPayload;
  return { exitCode: result.exitCode, payload };
}

function namedCheck(payload: DoctorPayload, name: string): DoctorCheckResult {
  const check = payload.checks.find((entry) => entry.name === name);
  if (!check) throw new Error(`doctor check not reported: ${name}`);
  return check;
}

describe("doctorCommand SWI-Prolog check", () => {
  test("reports source, path, and version as structured details", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(0);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(true);
    expect(check.details).toEqual({
      source: "env",
      path: process.env.KIBI_SWIPL,
      version: "9.2",
    });
  });

  test("fails an explicit KIBI_SWIPL older than 9.0 with guidance", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog version 8.4 (threaded)\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toContain(
      "is SWI-Prolog 8.4, but 9.0 or newer is required",
    );
    expect(check.details?.code).toBe("swipl_env_invalid");
  });

  test("fails when the banner has no parsable version", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl("SWI-Prolog (threaded, 64 bits, version unknown)\n");
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toContain("could not report its version");
  });

  test("fails and names the libraries the resolved SWI-Prolog cannot load", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl({
      banner: "SWI-Prolog version 10.0.2 for x86_64-linux\n",
      missingLibraries: ["pcre", "chr"],
    });
    const { exitCode, payload } = await runDoctorJson(cwd);
    expect(exitCode).toBe(1);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toContain(
      "cannot load required libraries: pcre, chr",
    );
    expect(check.details?.missingLibraries).toEqual(["pcre", "chr"]);
    expect(check.remediation).toContain("full SWI-Prolog");
  });

  test("fails when the required-library probe itself cannot run", async () => {
    const cwd = preparedWorkspace();
    writeOkManifest(cwd);
    mockSwipl({
      banner: "SWI-Prolog version 10.0.2 for x86_64-linux\n",
      probeExitStatus: 2,
    });
    const { payload } = await runDoctorJson(cwd);
    const check = namedCheck(payload, "SWI-Prolog");
    expect(check.passed).toBe(false);
    expect(check.message).toContain("load check could not run (exit status 2)");
  });
});
