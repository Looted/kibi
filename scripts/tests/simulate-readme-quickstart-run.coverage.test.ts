// executable_for TEST-prolog-bundled-quickstart
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { main, simulate } from "../simulate-readme-quickstart.mjs";

const PLATFORM =
  process.platform === "linux"
    ? `kibi-swipl-linux-${process.arch}-gnu`
    : `kibi-swipl-${process.platform}-${process.arch}`;

const README = [
  "# Kibi",
  "",
  "## Quick start",
  "",
  "```bash",
  "# install the CLI",
  "npm install -D kibi-cli",
  "",
  "```",
  "",
  "## Next",
  "",
].join("\n");

// A stand-in npm: installs succeed, and `npm exec -- kibi <cmd>` prints the
// fixture file for <cmd> with @PROJECT@ replaced by the working directory.
const FAKE_NPM = `#!/bin/sh
if [ "$1" = "exec" ]; then
  cmd="$5"
  out="$FAKE_NPM_DIR/$cmd.out"
  if [ -f "$FAKE_NPM_DIR/$cmd.touch" ]; then : > "$(/bin/cat "$FAKE_NPM_DIR/$cmd.touch")"; fi
  if [ -f "$out" ]; then /bin/sed "s|@PROJECT@|$PWD|g" "$out"; fi
  if [ -f "$FAKE_NPM_DIR/$cmd.status" ]; then exit "$(/bin/cat "$FAKE_NPM_DIR/$cmd.status")"; fi
  exit 0
fi
echo "npm $*" >> "$FAKE_NPM_DIR/install.log"
exit 0
`;

const created: string[] = [];
const savedEnv = { ...process.env };
let logs: string[];
let errors: string[];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

type Harness = { packagesDir: string; npmDir: string; bin: string };

function packageDir(packagesDir: string, dir: string, name: string): void {
  mkdirSync(path.join(packagesDir, dir));
  writeFileSync(
    path.join(packagesDir, dir, "package.json"),
    JSON.stringify({ name }),
  );
  writeFileSync(path.join(packagesDir, dir, `${name}-1.0.0.tgz`), "tgz");
}

function harness(): Harness {
  const root = tempDir("kibi-readme-run-");
  const packagesDir = path.join(root, "packages");
  mkdirSync(packagesDir);
  packageDir(packagesDir, "cli", "kibi-cli");
  packageDir(packagesDir, "core", "kibi-core");
  packageDir(packagesDir, "swipl", PLATFORM);
  const npmDir = path.join(root, "npm");
  mkdirSync(npmDir);
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  writeFileSync(path.join(bin, "npm"), FAKE_NPM);
  chmodSync(path.join(bin, "npm"), 0o755);
  const git = execFileSync("sh", ["-c", "command -v git"], {
    encoding: "utf8",
  }).trim();
  symlinkSync(git, path.join(bin, "git"));
  const h = { packagesDir, npmDir, bin };
  kibiOutput(h, "doctor", {
    checks: [
      { name: "Node", passed: true },
      {
        name: "SWI-Prolog",
        passed: true,
        message: "ok",
        details: {
          source: "bundled",
          version: "9.3.0",
          path: `@PROJECT@/node_modules/${PLATFORM}/bin/swipl`,
        },
      },
    ],
  });
  kibiOutput(h, "plan-bootstrap", {
    status: "success",
    data: { plan: { status: "ready", planHash: "0123456789abcdef0123" } },
  });
  kibiOutput(h, "apply-plan", {
    status: "success",
    data: { outcome: "applied" },
  });
  kibiOutput(h, "status", { syncState: "fresh", dirty: false });
  process.env.PATH = bin;
  process.env.FAKE_NPM_DIR = npmDir;
  process.env.KIBI_SWIPL = "/ignored/swipl";
  return h;
}

function kibiOutput(h: Harness, command: string, value: unknown): void {
  writeFileSync(
    path.join(h.npmDir, `${command}.out`),
    typeof value === "string" ? value : JSON.stringify(value),
  );
}

beforeEach(() => {
  logs = [];
  errors = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.join(" "));
  });
});

afterEach(() => {
  (console.log as unknown as { mockRestore(): void }).mockRestore();
  (console.error as unknown as { mockRestore(): void }).mockRestore();
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("README quick start simulation", () => {
  test("walks the README steps through bootstrap, sync and a fresh status", () => {
    const h = harness();
    const completed = simulate({ packagesDir: h.packagesDir, readme: README });
    expect(completed).toStrictEqual([
      "repository",
      "readme: npm install -D kibi-cli",
      "doctor: bundled 9.3.0",
      "bootstrap: applied plan 0123456789ab",
      "check",
      "sync",
      "status: fresh, clean",
    ]);
    const install = readFileSync(path.join(h.npmDir, "install.log"), "utf8");
    expect(install).toBe(
      `npm install -D ${path.join(h.packagesDir, "cli", "kibi-cli-1.0.0.tgz")}\n`,
    );
    expect(logs).toContain(
      "\n$ npm install -D kibi-cli    # tarballs substituted",
    );
    expect(logs).toContain("\n$ npm exec -- kibi doctor --format json");
  });

  test("a step that runs unchanged keeps its README label", () => {
    const h = harness();
    const readme = README.replace(
      "npm install -D kibi-cli\n",
      "npm install -D kibi-cli\necho done\n",
    );
    const completed = simulate({ packagesDir: h.packagesDir, readme });
    expect(completed).toContain("readme: echo done");
    expect(logs).toContain("\n$ echo done");
    expect(logs).toContain("done");
  });

  test("long command output is truncated in the log", () => {
    const h = harness();
    kibiOutput(h, "check", "x".repeat(2500));
    simulate({ packagesDir: h.packagesDir, readme: README });
    expect(logs).toContain(`${"x".repeat(2000)}\n...`);
  });

  test("refuses to run without the host platform tarball", () => {
    const h = harness();
    rmSync(path.join(h.packagesDir, "swipl"), { recursive: true });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow(
      `no ${PLATFORM} tarball under ${h.packagesDir}; pack the publishable slice`,
    );
  });

  test("refuses to run while swipl is on PATH", () => {
    const h = harness();
    const other = tempDir("kibi-readme-swipl-");
    writeFileSync(path.join(other, "swipl"), "");
    process.env.PATH = `${path.delimiter}${other}${path.delimiter}${h.bin}`;
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow(
      `swipl is on PATH (${path.join(other, "swipl")}); this run would prove nothing`,
    );
    Reflect.deleteProperty(process.env, "PATH");
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow();
  });

  test("refuses a README that installs nothing packed", () => {
    const h = harness();
    expect(() =>
      simulate({
        packagesDir: h.packagesDir,
        readme: README.replace("kibi-cli", "left-pad"),
      }),
    ).toThrow(
      "the README quick start installs no package this run can substitute",
    );
  });

  test("a failing step stops the run", () => {
    const h = harness();
    writeFileSync(path.join(h.npmDir, "check.status"), "3");
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("`npm exec -- kibi check` exited 3");
  });

  test("doctor must print JSON and report a passing bundled SWI-Prolog", () => {
    const h = harness();
    kibiOutput(h, "doctor", "not json");
    writeFileSync(path.join(h.npmDir, "doctor.status"), "1");
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("kibi doctor did not print JSON:");

    kibiOutput(h, "doctor", { checks: [] });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("doctor SWI-Prolog check: undefined");

    kibiOutput(h, "doctor", {
      checks: [{ name: "SWI-Prolog", passed: false, message: "missing" }],
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("doctor SWI-Prolog check: missing");

    kibiOutput(h, "doctor", {
      checks: [
        {
          name: "SWI-Prolog",
          passed: true,
          details: { source: "system", version: "9", path: "/usr/bin/swipl" },
        },
      ],
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("doctor reported system, expected bundled");
    expect(
      simulate({
        packagesDir: h.packagesDir,
        readme: README,
        requireBundled: false,
      }),
    ).toContain("doctor: system 9");

    kibiOutput(h, "doctor", {
      checks: [
        {
          name: "SWI-Prolog",
          passed: true,
          details: { source: "bundled", path: "/elsewhere/swipl" },
        },
      ],
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow(`bundled swipl is not inside ${PLATFORM}: /elsewhere/swipl`);
  });

  test("bootstrap must plan and apply", () => {
    const h = harness();
    kibiOutput(h, "plan-bootstrap", {
      status: "error",
      error: { code: "NOPE" },
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow('bootstrap plan is not ready: {"code":"NOPE"}');
    kibiOutput(h, "plan-bootstrap", {
      status: "success",
      data: { plan: { status: "blocked" } },
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow('bootstrap plan is not ready: "blocked"');

    kibiOutput(h, "plan-bootstrap", {
      status: "success",
      data: { plan: { status: "ready", planHash: "abcdefabcdefabcdef" } },
    });
    kibiOutput(h, "apply-plan", { status: "error", error: "denied" });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow('bootstrap apply failed: "denied"');
    kibiOutput(h, "apply-plan", {
      status: "success",
      data: { outcome: "skipped" },
    });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow('bootstrap apply failed: "skipped"');
  });

  test("the final status must be fresh and clean with no swipl on PATH", () => {
    const h = harness();
    kibiOutput(h, "status", { syncState: "stale", dirty: false });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow(
      'status is not fresh and clean: {"syncState":"stale","dirty":false}',
    );
    kibiOutput(h, "status", { syncState: "fresh", dirty: true });
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow(
      'status is not fresh and clean: {"syncState":"fresh","dirty":true}',
    );

    kibiOutput(h, "status", { syncState: "fresh", dirty: false });
    writeFileSync(
      path.join(h.npmDir, "sync.touch"),
      path.join(h.bin, "swipl.exe"),
    );
    expect(() =>
      simulate({ packagesDir: h.packagesDir, readme: README }),
    ).toThrow("swipl appeared on PATH during the run");
    expect(existsSync(path.join(h.bin, "swipl.exe"))).toBe(true);
  });
});

describe("README quick start command line", () => {
  test("prints a summary and appends it to the step summary", () => {
    const h = harness();
    const readmePath = path.join(h.npmDir, "README.md");
    writeFileSync(readmePath, README);
    const summaryPath = path.join(h.npmDir, "summary.md");
    process.env.GITHUB_STEP_SUMMARY = summaryPath;
    expect(main(["--tarballs", h.packagesDir, "--readme", readmePath])).toBe(0);
    const summary = readFileSync(summaryPath, "utf8");
    expect(summary).toStartWith(
      `README quick start reached a bootstrapped project on ${process.platform}-${process.arch}`,
    );
    expect(summary).toContain("- status: fresh, clean\n");
    expect(summary).toEndWith(
      "Registry installation is not verified here: the kibi-swipl-* names are not published yet.\n",
    );
    expect(logs.at(-1)).toBe(`\n${summary.trimEnd()}`);
  });

  test("runs without a step summary", () => {
    const h = harness();
    const readmePath = path.join(h.npmDir, "README.md");
    writeFileSync(readmePath, README);
    Reflect.deleteProperty(process.env, "GITHUB_STEP_SUMMARY");
    expect(main(["--tarballs", h.packagesDir, "--readme", readmePath])).toBe(0);
  });

  test("reports a failure and exits non-zero", () => {
    expect(main([])).toBe(1);
    expect(errors).toStrictEqual([
      "simulate-readme-quickstart: usage: simulate-readme-quickstart.mjs --tarballs <packages dir> [--readme <file>]",
    ]);
  });

  test("reads the repository README by default", () => {
    const h = harness();
    rmSync(path.join(h.packagesDir, "swipl"), { recursive: true });
    expect(main(["--tarballs", h.packagesDir])).toBe(1);
    expect(errors[0]).toContain(`no ${PLATFORM} tarball under`);
  });
});
