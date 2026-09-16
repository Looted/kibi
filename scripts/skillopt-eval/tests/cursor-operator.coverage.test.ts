// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CursorUsageError,
  main,
  parseCursorArgs,
  runCursorCommand,
} from "../cursor-operator";

const roots: string[] = [];
const originalRuntime = process.env.XDG_RUNTIME_DIR;
const originalCache = process.env.XDG_CACHE_HOME;

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  if (originalRuntime === undefined) {
    Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
  } else {
    process.env.XDG_RUNTIME_DIR = originalRuntime;
  }
  if (originalCache === undefined) {
    Reflect.deleteProperty(process.env, "XDG_CACHE_HOME");
  } else {
    process.env.XDG_CACHE_HOME = originalCache;
  }
});

const FAKE_AGENT = `#!/bin/sh
case "$1" in
  --version) echo "2026.08.11-test"; exit 0 ;;
  status) echo '{"loggedIn":true}'; exit 0 ;;
  models) printf 'model-alpha\\n'; exit 0 ;;
  mcp)
    echo "playwright: ready"
    echo "kibi: ready"
    exit 0 ;;
esac
exit 0
`;

const FAILING_AGENT = `#!/bin/sh
echo "not available" >&2
exit 1
`;

async function writeAgent(body: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cursor-op-"));
  roots.push(root);
  const path = join(root, "cursor-agent");
  await writeFile(path, body, { mode: 0o700 });
  await chmod(path, 0o700);
  return path;
}

async function isolateOperatorBase(): Promise<string> {
  const runtime = await mkdtemp(join(tmpdir(), "skillopt-cursor-runtime-"));
  roots.push(runtime);
  process.env.XDG_RUNTIME_DIR = runtime;
  process.env.XDG_CACHE_HOME = runtime;
  return runtime;
}

describe("cursor-operator leftover branches", () => {
  test("parseCursorArgs covers every flag and error", () => {
    expect(
      parseCursorArgs([
        "compat",
        "--skill",
        "kibi-traceability",
        "--phase",
        "development",
        "--cursor-executable",
        "/bin/cursor-agent",
        "--candidate",
        "c.md",
        "--one-shot",
        "o.md",
        "--fixture-run-root",
        "/tmp/fx",
        "--artifact-root",
        "/tmp/art",
        "--run-id",
        "run-9",
      ]),
    ).toEqual({
      command: "compat",
      skill: "kibi-traceability",
      phase: "development",
      cursorExecutable: "/bin/cursor-agent",
      candidatePath: "c.md",
      oneShotPath: "o.md",
      fixtureRunRoot: "/tmp/fx",
      artifactRoot: "/tmp/art",
      runId: "run-9",
    });
    expect(() => parseCursorArgs(["qualify", "--skill"])).toThrow(
      CursorUsageError,
    );
    expect(() => parseCursorArgs(["qualify", "--phase", "prod"])).toThrow(
      /--phase must be development or held-out/,
    );
    expect(() => parseCursorArgs(["qualify", "--skill", "bundle"])).toThrow(
      /--skill must be one of/,
    );
    expect(() => parseCursorArgs(["qualify", "--unknown"])).toThrow(
      /Unknown cursor option/,
    );
  });

  test("runCursorCommand qualify and compat failure branches", async () => {
    await isolateOperatorBase();
    const failing = await writeAgent(FAILING_AGENT);
    const failArt = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(failArt);
    expect(
      await runCursorCommand({
        command: "qualify",
        skill: "kibi-usage",
        phase: "development",
        cursorExecutable: failing,
        artifactRoot: failArt,
        runId: "qual-fail",
      }),
    ).toBe(1);

    const passing = await writeAgent(FAKE_AGENT);
    const passArt = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(passArt);
    expect(
      await runCursorCommand({
        command: "qualify",
        skill: "kibi-usage",
        phase: "development",
        cursorExecutable: passing,
        artifactRoot: passArt,
        runId: "qual-pass",
      }),
    ).toBe(0);

    const unqualArt = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(unqualArt);
    expect(
      await runCursorCommand({
        command: "compat",
        skill: "kibi-usage",
        phase: "development",
        cursorExecutable: failing,
        artifactRoot: unqualArt,
        runId: "compat-unqualified",
      }),
    ).toBe(1);

    const noFixArt = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(noFixArt);
    await expect(
      runCursorCommand({
        command: "compat",
        skill: "kibi-usage",
        phase: "development",
        cursorExecutable: passing,
        artifactRoot: noFixArt,
        runId: "compat-no-fixture",
      }),
    ).rejects.toThrow(/compat requires --fixture-run-root/);

    const noCandArt = await mkdtemp(join(tmpdir(), "skillopt-cursor-art-"));
    roots.push(noCandArt);
    await expect(
      runCursorCommand({
        command: "compat",
        skill: "kibi-usage",
        phase: "development",
        cursorExecutable: passing,
        artifactRoot: noCandArt,
        fixtureRunRoot: "/tmp/missing-fixtures",
        runId: "compat-no-candidate",
      }),
    ).rejects.toThrow(/compat requires --candidate PATH/);
  });

  test("main maps usage and runtime errors", async () => {
    expect(await main(["bogus"])).toBe(2);
    await isolateOperatorBase();
    const failing = await writeAgent(FAILING_AGENT);
    expect(
      await main(["qualify", "--cursor-executable", failing, "--run-id", "m1"]),
    ).toBe(1);
  });
});
