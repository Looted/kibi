import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ZCODE_NATIVE_CASES,
  ZCODE_PROOF_COMMAND,
  main,
  parseJUnitCases,
  runIfInvoked,
  runZcodeProof,
} from "../run-zcode-proof.mjs";

const SCRIPT = path.join(import.meta.dir, "..", "run-zcode-proof.mjs");
const SNAPSHOT = "e".repeat(64);
const created: string[] = [];
const savedEnv = { ...process.env };

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-zcode-run-"));
  created.push(dir);
  return dir;
}

function junit(
  cases: ReadonlyArray<{ file: string; classname: string; name: string }>,
) {
  return `<?xml version="1.0"?>\n<testsuites>${cases
    .map(
      (entry) =>
        `<testcase file="${entry.file}" classname="${entry.classname}" name="${entry.name.replaceAll('"', "&quot;")}" time="0.25"/>`,
    )
    .join("\n")}</testsuites>\n`;
}

/** A bun stand-in that writes `report` to --reporter-outfile and exits `code`. */
function fakeBun(dir: string, report: string, code = 0, extra = ""): string {
  const reportPath = path.join(dir, "report.xml");
  writeFileSync(reportPath, report);
  const bun = path.join(dir, "bun");
  writeFileSync(
    bun,
    `#!/bin/sh
${extra}
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--reporter-outfile" ]; then /bin/cp "${reportPath}" "$2"; fi
  shift
done
[ "$KIBI_ZCODE_PACKED_SMOKE$KIBI_PROOF_RUN" = 11 ] || exit 64
exit ${code}
`,
  );
  chmodSync(bun, 0o755);
  return bun;
}

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  process.exitCode = 0;
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("running the ZCode proof", () => {
  test("writes a passing artifact from the native JUnit cases", () => {
    const dir = tempDir();
    const outputPath = path.join(dir, "proof.json");
    const artifact = runZcodeProof({
      workspaceRoot: dir,
      outputPath,
      testIds: ["TEST-zcode-kibi-plugin-v1"],
      bun: fakeBun(dir, junit(ZCODE_NATIVE_CASES)),
      snapshot: SNAPSHOT,
      integration: "ci",
      commandArgv: ["custom", "argv"],
    });
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toStrictEqual(
      artifact,
    );
    expect(artifact.integration).toBe("ci");
    expect(artifact.command_argv).toStrictEqual(["custom", "argv"]);
    expect(artifact.run.outcome).toBe("passed");
    expect(artifact.proof_results).toHaveLength(ZCODE_NATIVE_CASES.length);
    expect(artifact.proof_results[0].attempts.entries).toStrictEqual([
      { outcome: "passed", duration_ms: 250 },
    ]);
  });

  test("reads its settings from the proof environment", () => {
    const dir = tempDir();
    process.env.KIBI_PROOF_OUTPUT = path.join(dir, "env-proof.json");
    process.env.KIBI_PROOF_TEST_IDS = '["TEST-zcode-kibi-plugin-v1"]';
    process.env.BUN_BIN = fakeBun(dir, junit(ZCODE_NATIVE_CASES));
    process.env.KIBI_PROOF_SNAPSHOT = SNAPSHOT;
    process.env.KIBI_PROOF_COMMAND_ARGV = '["node","proof.mjs"]';
    const artifact = runZcodeProof({ workspaceRoot: dir });
    expect(artifact.integration).toBe("self-proof");
    expect(artifact.command_argv).toStrictEqual(["node", "proof.mjs"]);
    expect(existsSync(path.join(dir, "env-proof.json"))).toBe(true);

    Reflect.deleteProperty(process.env, "KIBI_PROOF_COMMAND_ARGV");
    process.env.KIBI_PROOF_INTEGRATION = "release";
    const fallback = main();
    expect(fallback.command_argv).toStrictEqual(ZCODE_PROOF_COMMAND);
    expect(fallback.integration).toBe("release");
  });

  test("rejects a malformed command argv", () => {
    const dir = tempDir();
    const bun = fakeBun(dir, junit(ZCODE_NATIVE_CASES));
    for (const argv of ["{}", "[]", '[""]', "[1]"]) {
      process.env.KIBI_PROOF_COMMAND_ARGV = argv;
      expect(() =>
        runZcodeProof({
          outputPath: path.join(dir, "p.json"),
          testIds: ["TEST-zcode-kibi-plugin-v1"],
          bun,
          snapshot: SNAPSHOT,
        }),
      ).toThrow("KIBI_PROOF_COMMAND_ARGV must be a non-empty JSON argv array");
    }
  });

  test("needs an output path and the exact test selection", () => {
    Reflect.deleteProperty(process.env, "KIBI_PROOF_OUTPUT");
    expect(() => runZcodeProof({})).toThrow("KIBI_PROOF_OUTPUT is required");
    Reflect.deleteProperty(process.env, "KIBI_PROOF_TEST_IDS");
    expect(() => runZcodeProof({ outputPath: "x.json" })).toThrow(
      'KIBI_PROOF_TEST_IDS must be exactly ["TEST-zcode-kibi-plugin-v1"]',
    );
  });

  test("fails on a failing suite, an empty report, a signal or a missing bun", () => {
    const dir = tempDir();
    const options = {
      workspaceRoot: dir,
      outputPath: path.join(dir, "p.json"),
      testIds: ["TEST-zcode-kibi-plugin-v1"],
      snapshot: SNAPSHOT,
    };
    expect(() =>
      runZcodeProof({
        ...options,
        bun: fakeBun(dir, junit(ZCODE_NATIVE_CASES), 2),
      }),
    ).toThrow("ZCode adapter suite failed with exit code 2");
    expect(() => runZcodeProof({ ...options, bun: fakeBun(dir, "") })).toThrow(
      "Bun produced an empty JUnit report",
    );
    expect(() =>
      runZcodeProof({
        ...options,
        bun: fakeBun(dir, "x", 0, "kill -TERM $$"),
      }),
    ).toThrow("Bun test was terminated by a signal");
    expect(() =>
      runZcodeProof({ ...options, bun: path.join(dir, "missing-bun") }),
    ).toThrow();
    expect(existsSync(options.outputPath)).toBe(false);
  });
});

describe("ZCode JUnit parsing", () => {
  test("a negative or unreadable duration counts as zero", () => {
    expect(
      parseJUnitCases(
        '<testcase name="a" time="-1"/><testcase name="b" time="soon"/>',
      ).map((entry: { duration_ms: number }) => entry.duration_ms),
    ).toStrictEqual([0, 0]);
  });
});

describe("ZCode proof entry point", () => {
  test("runs only when invoked directly and reports failures", () => {
    runIfInvoked(undefined);
    runIfInvoked(path.join(import.meta.dir, "other.mjs"));
    expect(process.exitCode).toBe(0);

    const dir = tempDir();
    const stderr: string[] = [];
    const write = spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    try {
      Reflect.deleteProperty(process.env, "KIBI_PROOF_OUTPUT");
      runIfInvoked(SCRIPT);
      expect(process.exitCode).toBe(1);
      expect(stderr).toStrictEqual(["KIBI_PROOF_OUTPUT is required\n"]);

      process.exitCode = 0;
      process.env.KIBI_PROOF_OUTPUT = path.join(dir, "ok.json");
      process.env.KIBI_PROOF_TEST_IDS = '["TEST-zcode-kibi-plugin-v1"]';
      process.env.BUN_BIN = fakeBun(dir, junit(ZCODE_NATIVE_CASES));
      process.env.KIBI_PROOF_SNAPSHOT = SNAPSHOT;
      runIfInvoked(SCRIPT);
      expect(process.exitCode).toBe(0);
      expect(existsSync(path.join(dir, "ok.json"))).toBe(true);
    } finally {
      write.mockRestore();
    }
  });
});
