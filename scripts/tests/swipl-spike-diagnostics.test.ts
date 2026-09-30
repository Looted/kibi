import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const SPIKE = join(ROOT, "scripts", "swipl-spike.py");
const fixtures: string[] = [];
const SENTINEL = "diagnostic-must-not-record-argv-or-env";
const linuxTest = process.platform === "linux" ? test : test.skip;

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-spike-diagnostics-"));
  fixtures.push(root);
  return root;
}

function runControl(
  root: string,
  diagnostics: string,
  exitCode: number,
  child: boolean,
) {
  const program = `
import importlib.util, os, pathlib, subprocess, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('spike', sys.argv[1])
spike = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spike)
child_program = '''
import subprocess, sys, threading
print("child stdout", flush=True)
print("child stderr", file=sys.stderr, flush=True)
if ${child ? "True" : "False"}:
    worker = threading.Thread(target=lambda: subprocess.run([sys.executable, '-c', 'import time; time.sleep(1.8)', '${SENTINEL}']))
    worker.start()
    worker.join()
sys.exit(${exitCode})
'''
try:
    spike.run_monitored_cli(sys.executable, '-c', child_program,
        cwd=pathlib.Path.cwd(), env=dict(os.environ), diagnostics=pathlib.Path(sys.argv[2]))
except subprocess.CalledProcessError as error:
    sys.exit(error.returncode)
`;
  return spawnSync("python3", ["-c", program, SPIKE, diagnostics], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, KIBI_DIAGNOSTIC_SENTINEL: SENTINEL },
    timeout: 10_000,
  });
}

type ProcessSample = {
  rootPid: number;
  processes: {
    pid: number;
    ppid: number;
    startTicks: number;
    childDiscovery: { tasksInspected: number; taskLimitReached: boolean };
  }[];
  final: boolean;
};

describe("native Linux CLI diagnostics", () => {
  linuxTest.each([0, 7])(
    "preserves exit %i and observes background-thread children",
    (exitCode) => {
      const root = fixture();
      const diagnostics = join(root, "samples.jsonl");
      const result = runControl(root, diagnostics, exitCode, true);

      expect(result.status).toBe(exitCode);
      expect(result.stdout.split("\n")).toContain("child stdout");
      expect(result.stderr.split("\n")).toContain("child stderr");
      const bytes = readFileSync(diagnostics, "utf8");
      expect(bytes).not.toContain(SENTINEL);
      expect(bytes).not.toContain('"argv"');
      expect(bytes).not.toContain('"environment"');
      const samples = bytes
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as ProcessSample);
      expect(
        samples.some((sample) =>
          sample.processes.some((process) => process.ppid === sample.rootPid),
        ),
      ).toBe(true);
      expect(samples.at(-1)?.final).toBe(true);
      for (const sample of samples) {
        expect(sample.processes.length).toBeLessThanOrEqual(256);
        for (const process of sample.processes) {
          expect(process.startTicks).toBeGreaterThan(0);
          expect(process.childDiscovery.tasksInspected).toBeLessThanOrEqual(
            256,
          );
          expect(process.childDiscovery.taskLimitReached).toBe(false);
        }
      }
    },
  );

  linuxTest(
    "unavailable diagnostic output preserves a successful command",
    () => {
      const root = fixture();
      const blocker = join(root, "not-a-directory");
      writeFileSync(blocker, "blocker");
      const diagnostics = join(blocker, "samples.jsonl");
      const result = runControl(root, diagnostics, 0, false);

      expect(result.status).toBe(0);
      expect(result.stdout.split("\n")).toContain("child stdout");
      expect(result.stderr.split("\n")).toContain("child stderr");
      expect(result.stderr).toContain(
        "CLI diagnostics unavailable (NotADirectoryError)",
      );
      expect(existsSync(diagnostics)).toBe(false);
    },
  );
});
