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
import { main, replaySteps } from "../replay-proof-ci.ts";

const WORKFLOW = `name: Proof
jobs:
  proof:
    steps:
      - uses: actions/checkout@v4
      - name: Check whether the PR can reuse develop proof
        run: bun scripts/ci-proof-reuse.ts decide out.json
      - name: Bootstrap Ubuntu packages
        run: sudo apt-get install -y z3
      - name: Install SWI-Prolog
        run: ./install-swipl.sh
      - name: Provision strict-proof host prerequisites
        run: |
          npm install -g something
          uv sync --frozen
      - name: Record the branch
        env:
          EXTRA: value
          TOKEN: \${{ secrets.TOKEN }}
        run: |
          echo "$KIBI_BRANCH $EXTRA \${TOKEN:-unset}" > "$REPLAY_LOG"
          test "$KIBI_CLI" = ./packages/cli/bin/kibi
      - name: Enforce evidence floors on a clean snapshot
        run: test -f tracked.txt
      - name: Publish report
        run: exit 9
`;

const created: string[] = [];
const savedEnv = { ...process.env };
const savedCwd = process.cwd();
let logs: string[];
let errors: string[];
let warnings: string[];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

function which(tool: string): string {
  return execFileSync("sh", ["-c", `command -v ${tool}`], {
    encoding: "utf8",
  }).trim();
}

const REAL = {
  git: which("git"),
  sh: which("sh"),
  bash: which("bash"),
};

type Host = { root: string; bin: string; log: string };

function host(
  workflow = WORKFLOW,
  tools = ["swipl", "uv", "codex", "bwrap", "z3", "lake", "bun", "node"],
): Host {
  const base = tempDir("kibi-replay-");
  const root = path.join(base, "repo");
  mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(root, ".github", "workflows", "proof.yml"), workflow);
  writeFileSync(path.join(root, "tracked.txt"), "tracked\n");
  const git = (...args: string[]) =>
    execFileSync(REAL.git, args, { cwd: root, encoding: "utf8" });
  git("init", "-q", "-b", "feature");
  git("config", "user.name", "Replay Test");
  git("config", "user.email", "replay@example.test");
  git("config", "commit.gpgsign", "false");
  git("add", ".");
  git("commit", "-qm", "init");

  const bin = path.join(base, "bin");
  mkdirSync(bin);
  symlinkSync(REAL.git, path.join(bin, "git"));
  symlinkSync(REAL.sh, path.join(bin, "sh"));
  symlinkSync(REAL.bash, path.join(bin, "bash"));
  for (const tool of tools) {
    writeFileSync(path.join(bin, tool), "#!/bin/sh\nexit 0\n");
    chmodSync(path.join(bin, tool), 0o755);
  }
  const log = path.join(base, "replay.log");
  process.env.PATH = bin;
  process.env.REPLAY_LOG = log;
  process.chdir(root);
  return { root, bin, log };
}

beforeEach(() => {
  logs = [];
  errors = [];
  warnings = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.join(" "));
  });
  spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    warnings.push(args.join(" "));
  });
});

afterEach(() => {
  (console.log as unknown as { mockRestore(): void }).mockRestore();
  (console.error as unknown as { mockRestore(): void }).mockRestore();
  (console.warn as unknown as { mockRestore(): void }).mockRestore();
  process.chdir(savedCwd);
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("proof replay command", () => {
  test("a dry run lists the replayed steps without running them", () => {
    host();
    expect(main(["--dry-run"])).toBe(0);
    expect(logs[0]).toMatch(
      /^Replaying \.github\/workflows\/proof\.yml for feature @ [a-f0-9]{40}$/,
    );
    expect(logs.slice(1)).toStrictEqual([
      "  - Provision strict-proof host prerequisites (repository-local part)",
      "  - Record the branch",
      "  - Enforce evidence floors on a clean snapshot",
      "Skipped host provisioning: Check whether the PR can reuse develop proof; Bootstrap Ubuntu packages; Install SWI-Prolog; Provision strict-proof host prerequisites",
    ]);
  });

  test("replays every gate step in a fresh clone of the branch", () => {
    const h = host();
    expect(main([])).toBe(0);
    expect(logs).toContain("\nProof replay passed every CI proof gate step.");
    expect(logs).toContain("\n==> Record the branch");
    expect(readFileSync(h.log, "utf8")).toBe("feature value unset\n");
    expect(warnings).toStrictEqual([]);
  });

  test("warns about uncommitted changes and can keep the workspace", () => {
    const h = host();
    writeFileSync(path.join(h.root, "dirty.txt"), "dirty\n");
    expect(main(["--keep"])).toBe(0);
    expect(warnings).toStrictEqual([
      "Working tree has uncommitted changes; the replay proves the committed HEAD only.",
    ]);
    const kept = logs.at(-1)?.replace("Replay workspace kept at ", "") ?? "";
    expect(existsSync(path.join(kept, "tracked.txt"))).toBe(true);
    created.push(kept);
  });

  test("stops at the first failing step with its exit status", () => {
    host(WORKFLOW.replace("run: test -f tracked.txt", "run: exit 4"));
    expect(main([])).toBe(4);
    expect(errors).toStrictEqual([
      '\nProof replay failed at "Enforce evidence floors on a clean snapshot" (exit 4).',
    ]);
  });

  test("refuses a detached HEAD", () => {
    const h = host();
    execFileSync(REAL.git, ["checkout", "-q", "--detach"], { cwd: h.root });
    expect(main([])).toBe(1);
    expect(errors[0]).toStartWith("Proof replay needs a checked-out branch");
  });

  test("names the host tools that are missing", () => {
    host(WORKFLOW, ["swipl", "uv", "bun", "node", "bwrap"]);
    expect(main([])).toBe(1);
    expect(errors).toStrictEqual([
      "Missing host tools the CI provisioning steps install: codex, z3, lake",
    ]);
  });

  test("a failed clone or git query fails loudly", () => {
    const h = host();
    rmSync(path.join(h.bin, "git"));
    writeFileSync(
      path.join(h.bin, "git"),
      `#!/bin/sh\n[ "$1" = clone ] && exit 1\nexec "${REAL.git}" "$@"\n`,
    );
    chmodSync(path.join(h.bin, "git"), 0o755);
    expect(() => main([])).toThrow("git clone failed");

    process.chdir(tempDir("kibi-replay-nogit-"));
    expect(() => main([])).toThrow("git rev-parse --show-toplevel failed");
  });

  test("a missing executable is an error, not a status", () => {
    const h = host();
    rmSync(path.join(h.bin, "git"));
    expect(() => main([])).toThrow();
  });

  test("a workflow without the final gate step is rejected", () => {
    expect(() => replaySteps("jobs: {}\n")).toThrow(
      '.github/workflows/proof.yml has no "Enforce evidence floors on a clean snapshot" step',
    );
  });
});
